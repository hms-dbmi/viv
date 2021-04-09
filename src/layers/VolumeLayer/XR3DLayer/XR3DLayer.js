/* This is largely an adaptation of Will Usher's excellent blog post/code:
https://github.com/Twinklebear/webgl-volume-raycaster
Without his app, this would have been exponentially more difficult to do, so we thank him dearly.

The major changes are:

- Code has been adapted to the luma.gl/deck.gl framework instead of more-or-less pure WebGL.

- We use a coordinate system that will allow overlays/other figures on our vertex shader/javascript via the `uniform mat4 scale` that matches raw pixel size multiplied by
the ratio of physical sizes (if present) to the world space, just like our 2D layers.  Will implements everything in a unit cube (I think?) centered at the origin.

- We use an OrbitView which is a similar camera to what Will has, but stops gimbal lock from happening
by stopping full rotations whereas Will implements a camera that allows for full rotations without gimbal lock via quaternions.
We have an open issue for implementing this deck.gl: https://github.com/visgl/deck.gl/issues/5364

- We have a multi-channel use case and have a few tweaks in the fragment shader to handle that.

- We convert all of our data to Float32Array so we can use LINEAR sampling while also maintaing the dynamic range and integrity of the data.

- Will uses a colormap via a sampled texture, which is a very good idea, but not something we are geared up for in 2D, so not something we will do in 3D either: 
https://github.com/visgl/luma.gl/issues/1415

- We allow for multiple rendering settings (Max/Min Int. Proj., Additive, etc.)

- We allow for arbtirary affine transformations via deck.gl's modelMatrix prop and have updated the vertex shader accordingly.
More information about that is detailed in the comments there.
*/
import GL from '@luma.gl/constants';
import { COORDINATE_SYSTEM, Layer } from '@deck.gl/core';
import { Model, Geometry, Texture3D, setParameters } from '@luma.gl/core';
import { Matrix4 } from 'math.gl';
import vs from './xr-layer-vertex.glsl';
import fs from './xr-layer-fragment.glsl';
import channels from './channel-intensity-module';
import { padColorsAndSliders } from '../../utils';
import {
  DTYPE_VALUES,
  COLORMAPS,
  RENDERING_MODES as RENDERING_NAMES
} from '../../../constants';
import {
  RENDERING_MODES_BLEND,
  RENDERING_MODES_COLORMAP
} from './rendering-modes';

// prettier-ignore
const CUBE_STRIP = [
	1, 1, 0,
	0, 1, 0,
	1, 1, 1,
	0, 1, 1,
	0, 0, 1,
	0, 1, 0,
	0, 0, 0,
	1, 1, 0,
	1, 0, 0,
	1, 1, 1,
	1, 0, 1,
	0, 0, 1,
	1, 0, 0,
	0, 0, 0
];

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  sliderValues: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint8', compare: true },
  colormap: { type: 'string', value: '', compare: true },
  xSlice: { type: 'array', value: [0, 1], compare: true },
  ySlice: { type: 'array', value: [0, 1], compare: true },
  zSlice: { type: 'array', value: [0, 1], compare: true },
  renderingMode: {
    type: 'string',
    value: RENDERING_NAMES.ADDITIVE,
    compare: true
  }
};

function removeExtraColormapFunctionsFromShader(colormap) {
  // Always include viridis so shaders compile,
  // but otherwise we discard all other colormaps via a regex.
  // With all the colormaps, the shaders were too large
  // and crashed our computers when we loaded volumes too large.
  const discardColormaps = COLORMAPS.filter(
    i => i !== (colormap || 'viridis')
  ).map(i => i.replace(/-/g, '_'));
  const discardRegex = new RegExp(
    `vec4 (${discardColormaps.join(
      '(_([0-9]*))?|'
    )})\\(float x_[0-9]+\\){([^}]+)}`,
    'g'
  );
  const channelsModules = {
    ...channels,
    fs: channels.fs.replace(discardRegex, ''),
    defines: {
      _COLORMAP_FUNCTION: colormap || 'viridis'
    }
  };
  return channelsModules;
}

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} sliderValues List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<Array.<number>>} colorValues List of [r, g, b] values for each channel.
 * @property {Array.<Array.<boolean>>} channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string=} renderingMode One of Maximum Intensity Projection, Minimum Intensity Projection, or Additive
 * @param {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @param {Array.<number>=} xSlice 0-1 interval on which to slice the volume.
 * @param {Array.<number>=} ySlice 0-1 interval on which to slice the volume.
 * @param {Array.<number>=} zSlice 0-1 interval on which to slice the volume.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 */
const XR3DLayer = class extends Layer {
  initializeState() {
    const { gl } = this.context;
    this.setState({
      model: this._getModel(gl)
    });
    // Needed to only render the back polygons.
    setParameters(gl, {
      [GL.CULL_FACE]: true,
      [GL.CULL_FACE_MODE]: GL.FRONT
    });
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    gl.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(GL.PACK_ALIGNMENT, 1);
  }

  /**
   * This function compiles the shaders and the projection module.
   */
  getShaders() {
    const { colormap, renderingMode } = this.props;
    const { _BEFORE_RENDER, _RENDER, _AFTER_RENDER } = colormap
      ? RENDERING_MODES_COLORMAP[renderingMode]
      : RENDERING_MODES_BLEND[renderingMode];
    const channelsModules = removeExtraColormapFunctionsFromShader(colormap);
    return super.getShaders({
      vs,
      fs: fs
        .replace('_BEFORE_RENDER', _BEFORE_RENDER)
        .replace('_RENDER', _RENDER)
        .replace('_AFTER_RENDER', _AFTER_RENDER),
      defines: {
        _COLORMAP_FUNCTION: colormap || 'viridis'
      },
      modules: [channelsModules]
    });
  }

  /**
   * This function finalizes state by clearing all textures from the WebGL context
   */
  finalizeState() {
    super.finalizeState();

    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex && tex.delete());
    }
  }

  /**
   * This function updates state by retriggering model creation (shader compilation and attribute binding)
   * and loading any textures that need be loading.
   */
  updateState({ props, oldProps, changeFlags }) {
    // setup model first
    if (
      changeFlags.extensionsChanged ||
      props.colormap !== oldProps.colormap ||
      props.renderingMode !== oldProps.renderingMode
    ) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({ model: this._getModel(gl) });
    }
    if (
      props.channelData &&
      props?.channelData?.data !== oldProps?.channelData?.data
    ) {
      this.loadTexture(props.channelData);
    }
  }

  /**
   * This function creates the luma.gl model.
   */
  _getModel(gl) {
    if (!gl) {
      return null;
    }
    return new Model(gl, {
      ...this.getShaders(),
      geometry: new Geometry({
        drawMode: gl.TRIANGLE_STRIP,
        attributes: {
          positions: new Float32Array(CUBE_STRIP)
        }
      })
    });
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw({ uniforms }) {
    const { textures, model, volDims } = this.state;
    const {
      sliderValues,
      colorValues,
      xSlice,
      ySlice,
      zSlice,
      modelMatrix,
      channelIsOn,
      domain,
      dtype
    } = this.props;
    const {
      viewMatrix,
      viewMatrixInverse,
      projectionMatrix
    } = this.context.viewport;
    if (textures && model && volDims) {
      const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
        sliderValues,
        colorValues,
        channelIsOn,
        domain,
        dtype
      });
      model
        .setUniforms({
          ...uniforms,
          ...textures,
          sliderValues: paddedSliderValues,
          colorValues: paddedColorValues,
          xSlice: new Float32Array(xSlice),
          ySlice: new Float32Array(ySlice),
          zSlice: new Float32Array(zSlice),
          eye_pos: new Float32Array([
            viewMatrixInverse[12],
            viewMatrixInverse[13],
            viewMatrixInverse[14]
          ]),
          view: viewMatrix,
          proj: projectionMatrix,
          scale: new Matrix4().scale(volDims),
          model: modelMatrix || new Matrix4()
        })
        .draw();
    }
  }

  /**
   * This function loads all textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadTexture(channelData) {
    const textures = {
      volume0: null,
      volume1: null,
      volume2: null,
      volume3: null,
      volume4: null,
      volume5: null
    };
    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex && tex.delete());
    }
    if (
      channelData &&
      Object.keys(channelData).length > 0 &&
      channelData.data
    ) {
      const { height, width, depth } = channelData;
      channelData.data.forEach((d, i) => {
        textures[`volume${i}`] = this.dataToTexture(d, width, height, depth);
      }, this);
      this.setState({
        textures,
        volDims: this.props.physicalSizeScalingMatrix.transformPoint([
          width,
          height,
          depth
        ])
      });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height, depth) {
    const { format, dataFormat, type } = DTYPE_VALUES.Float32;
    const texture = new Texture3D(this.context.gl, {
      width,
      height,
      depth,
      data: new Float32Array(data),
      // ? Seems to be a luma.gl bug.  Looks like Texture2D is wrong or this is but these are flipped somewhere.
      format: dataFormat,
      dataFormat: format,
      type,
      mipmaps: false,
      parameters: {
        // LINEAR results in the best results visually - otherwise everything looks pixelated.
        // The above cast to Float32Array is needed forthis setting to work (it does not work with integer data).
        [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
        [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_R]: GL.CLAMP_TO_EDGE
      }
    });
    return texture;
  }
};

XR3DLayer.layerName = 'XR3DLayer';
XR3DLayer.defaultProps = defaultProps;
export default XR3DLayer;
