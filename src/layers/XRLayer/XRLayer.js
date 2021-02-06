/* eslint-disable prefer-destructuring */
// A lot of this codes inherits paradigms form DeckGL that
// we live in place for now, hence some of the not-destructuring
import GL from '@luma.gl/constants';
import { COORDINATE_SYSTEM, Layer, project32, picking } from '@deck.gl/core';
import { Model, Geometry, Texture2D, isWebGL2 } from '@luma.gl/core';
import fsColormap1 from './xr-layer-fragment-colormap.webgl1.glsl';
import fsColormap2 from './xr-layer-fragment-colormap.webgl2.glsl';
import fs1 from './xr-layer-fragment.webgl1.glsl';
import fs2 from './xr-layer-fragment.webgl2.glsl';
import vs1 from './xr-layer-vertex.webgl1.glsl';
import vs2 from './xr-layer-vertex.webgl2.glsl';
import { lens, channels } from './shader-modules';
import { padColorsAndSliders, getDtypeValues } from '../utils';

const SHADER_MODULES = [
  { fs: fs1, fscmap: fsColormap1, vs: vs1 },
  { fs: fs2, fscmap: fsColormap2, vs: vs2 }
];

function getRenderingAttrs(dtype, gl) {
  if (!isWebGL2(gl)) {
    // WebGL1
    return {
      format: GL.LUMINANCE,
      dataFormat: GL.LUMINANCE,
      type: GL.FLOAT,
      sampler: 'sampler2D',
      shaderModule: SHADER_MODULES[0],
      cast: data => new Float32Array(data)
    };
  }
  const values = getDtypeValues(dtype);
  return { ...values, shaderModule: SHADER_MODULES[1] };
}

const defaultProps = {
  pickable: true,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  bounds: { type: 'array', value: [0, 0, 1, 1], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  opacity: { type: 'number', value: 1, compare: true },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  colormap: { type: 'string', value: '', compare: true },
  isLensOn: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  unprojectLensBounds: { type: 'array', value: [0, 0, 0, 0], compare: true },
  transparentColor: { type: 'array', value: null, compare: true }
};

/**
 * This layer serves as the workhorse of the project, handling all the rendering.  Much of it is
 * adapted from BitmapLayer in DeckGL.
 * XR = eXtended Range i.e more than the standard 8-bit RGBA data format
 * (16/32 bit floats/ints/uints with more than 3/4 channels).
 */
export default class XRLayer extends Layer {
  /**
   * This function chooses a shader (colormapping or not) and
   * replaces `usampler` with `sampler` if the data is not an unsigned integer
   */
  getShaders() {
    const { colormap, dtype } = this.props;
    const { shaderModule, sampler } = getRenderingAttrs(dtype, this.context.gl);
    return super.getShaders({
      fs: colormap ? shaderModule.fscmap : shaderModule.fs,
      vs: shaderModule.vs,
      defines: {
        SAMPLER_TYPE: sampler,
        COLORMAP_FUNCTION: colormap || 'viridis'
      },
      modules: [project32, picking, channels, lens]
    });
  }

  /**
   * This function initializes the internal state.
   */
  initializeState() {
    const { gl } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    gl.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(GL.PACK_ALIGNMENT, 1);
    const attributeManager = this.getAttributeManager();
    attributeManager.add({
      positions: {
        size: 3,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        update: this.calculatePositions,
        noAlloc: true
      }
    });
    this.setState({
      numInstances: 1,
      positions: new Float64Array(12)
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
    if (changeFlags.extensionsChanged || props.colormap !== oldProps.colormap) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({ model: this._getModel(gl) });

      this.getAttributeManager().invalidateAll();
    }
    if (
      props.channelData !== oldProps.channelData &&
      props.channelData?.data !== oldProps.channelData?.data
    ) {
      this.loadChannelTextures(props.channelData);
    }
    const attributeManager = this.getAttributeManager();
    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate('positions');
    }
  }

  /**
   * This function creates the luma.gl model.
   */
  _getModel(gl) {
    if (!gl) {
      return null;
    }

    /*
       0,0 --- 1,0
        |       |
       0,1 --- 1,1
     */
    return new Model(gl, {
      ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: GL.TRIANGLE_FAN,
        vertexCount: 4,
        attributes: {
          texCoords: new Float32Array([0, 1, 0, 0, 1, 0, 1, 1])
        }
      }),
      isInstanced: false
    });
  }

  /**
   * This function generates view positions for use as a vec3 in the shader
   */
  calculatePositions(attributes) {
    const { positions } = this.state;
    const { bounds } = this.props;
    // bounds as [minX, minY, maxX, maxY]
    /*
      (minX0, maxY3) ---- (maxX2, maxY3)
             |                  |
             |                  |
             |                  |
      (minX0, minY1) ---- (maxX2, minY1)
   */
    positions[0] = bounds[0];
    positions[1] = bounds[1];
    positions[2] = 0;

    positions[3] = bounds[0];
    positions[4] = bounds[3];
    positions[5] = 0;

    positions[6] = bounds[2];
    positions[7] = bounds[3];
    positions[8] = 0;

    positions[9] = bounds[2];
    positions[10] = bounds[1];
    positions[11] = 0;

    // eslint-disable-next-line  no-param-reassign
    attributes.value = positions;
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw({ uniforms }) {
    const { textures, model } = this.state;
    if (textures && model) {
      const {
        sliderValues,
        colorValues,
        opacity,
        domain,
        dtype,
        channelIsOn,
        unprojectLensBounds,
        bounds,
        isLensOn,
        lensSelection,
        lensBorderColor,
        lensBorderRadius,
        transparentColor
      } = this.props;
      // Check number of textures not null.
      const numTextures = Object.values(textures).filter(t => t).length;
      // Slider values and color values can come in before textures since their data is async.
      // Thus we pad based on the number of textures bound.
      const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
        sliderValues: sliderValues.slice(0, numTextures),
        colorValues: colorValues.slice(0, numTextures),
        channelIsOn: channelIsOn.slice(0, numTextures),
        domain,
        dtype
      });
      // Creating a unit-square scaled intersection box for rendering the lens.
      // It is ok if these coordinates are outside the unit square since
      // we check membership in or out of the lens on the fragment shader.
      const [
        leftMouseBound,
        bottomMouseBound,
        rightMouseBound,
        topMouseBound
      ] = unprojectLensBounds;
      const [left, bottom, right, top] = bounds;
      const leftMouseBoundScaled = (leftMouseBound - left) / (right - left);
      const bottomMouseBoundScaled = (bottomMouseBound - top) / (bottom - top);
      const rightMouseBoundScaled = (rightMouseBound - left) / (right - left);
      const topMouseBoundScaled = (topMouseBound - top) / (bottom - top);
      model
        .setUniforms({
          ...uniforms,
          colorValues: paddedColorValues,
          sliderValues: paddedSliderValues,
          opacity,
          majorLensAxis: (rightMouseBoundScaled - leftMouseBoundScaled) / 2,
          minorLensAxis: (bottomMouseBoundScaled - topMouseBoundScaled) / 2,
          lensCenter: [
            (rightMouseBoundScaled + leftMouseBoundScaled) / 2,
            (bottomMouseBoundScaled + topMouseBoundScaled) / 2
          ],
          isLensOn,
          lensSelection,
          lensBorderColor,
          lensBorderRadius,
          transparentColor: (transparentColor || [0, 0, 0]).map(i => i / 255),
          useTransparentColor: Boolean(transparentColor),
          ...textures
        })
        .draw();
    }
  }

  /**
   * This function loads all channel textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadChannelTextures(channelData) {
    const textures = {
      channel0: null,
      channel1: null,
      channel2: null,
      channel3: null,
      channel4: null,
      channel5: null
    };
    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex && tex.delete());
    }
    if (
      channelData &&
      Object.keys(channelData).length > 0 &&
      channelData.data
    ) {
      channelData.data.forEach((d, i) => {
        textures[`channel${i}`] = this.dataToTexture(
          d,
          channelData.width,
          channelData.height
        );
      }, this);
      this.setState({ textures });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height) {
    const attrs = getRenderingAttrs(this.props.dtype, this.context.gl);
    return new Texture2D(this.context.gl, {
      width,
      height,
      // data is cast in WebGL1 environment
      data: attrs.cast?.(data) ?? data,
      // we don't want or need mimaps
      mipmaps: false,
      parameters: {
        // NEAREST for integer data
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        // CLAMP_TO_EDGE to remove tile artifacts
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
      },
      format: attrs.format,
      dataFormat: attrs.dataFormat,
      type: attrs.type
    });
  }
}

XRLayer.layerName = 'XRLayer';
XRLayer.defaultProps = defaultProps;
