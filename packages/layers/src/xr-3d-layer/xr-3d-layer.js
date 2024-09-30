import { COORDINATE_SYSTEM, Layer } from '@deck.gl/core';
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
import { GL } from '@luma.gl/constants';
import { Geometry, Model } from '@luma.gl/engine';
import { ShaderAssembler } from '@luma.gl/shadertools';
import { Matrix4 } from '@math.gl/core';
import { Plane } from '@math.gl/culling';

import fs from './xr-3d-layer-fragment.glsl';
import vs from './xr-3d-layer-vertex.glsl';

import { ColorPalette3DExtensions } from '@vivjs/extensions';
import { getDtypeValues, padContrastLimits, padWithDefault } from '../utils';

const channelsModule = {
  name: 'channel-intensity-module',
  fs: `\
    float apply_contrast_limits(float intensity, vec2 contrastLimits) {
      float contrastLimitsAppliedToIntensity = (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0]));
      return max(0., contrastLimitsAppliedToIntensity);
    }
  `
};

// biome-ignore format: Avoid reformatting to keep the rows clear
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
const NUM_PLANES_DEFAULT = 1;

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  contrastLimits: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint8', compare: true },
  xSlice: { type: 'array', value: null, compare: true },
  ySlice: { type: 'array', value: null, compare: true },
  zSlice: { type: 'array', value: null, compare: true },
  clippingPlanes: { type: 'array', value: [], compare: true },
  resolutionMatrix: { type: 'object', value: new Matrix4(), compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPalette3DExtensions.AdditiveBlendExtension()],
    compare: true
  }
};

function getRenderingAttrs() {
  const values = getDtypeValues('Float32');
  return {
    ...values,
    sampler: values.sampler.replace('2D', '3D'),
    cast: data => new Float32Array(data)
  };
}

function getRenderingFromExtensions(extensions) {
  let rendering = {};
  extensions.forEach(extension => {
    rendering = extension.rendering;
  });
  if (!rendering._RENDER) {
    throw new Error(
      'XR3DLayer requires at least one extension to define opts.rendering as an object with _RENDER as a property at the minimum.'
    );
  }
  return rendering;
}

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {Object=} resolutionMatrix Matrix for scaling the volume based on the (downsampled) resolution being displayed.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const XR3DLayer = class extends Layer {
  initializeState() {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    const programManager = ShaderAssembler.getDefaultShaderAssembler();
    const processStr =
      'fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)';
    if (!programManager._hookFunctions.includes(processStr)) {
      programManager.addShaderHook(processStr);
    }
  }

  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return extensions?.some(e => {
      const shaders = e.getShaders();
      if (shaders) {
        const { inject = {}, modules = [] } = shaders;
        const definesInjection = inject[hookName];
        const moduleDefinesInjection = modules.some(m => m?.inject?.[hookName]);
        return definesInjection || moduleDefinesInjection;
      }
      return false;
    });
  }

  /**
   * This function compiles the shaders and the projection module.
   */
  getShaders() {
    const { clippingPlanes, extensions } = this.props;
    const { sampler } = getRenderingAttrs();
    const { _BEFORE_RENDER, _RENDER, _AFTER_RENDER } =
      getRenderingFromExtensions(extensions);
    const extensionDefinesDeckglProcessIntensity =
      this._isHookDefinedByExtensions('fs:DECKGL_PROCESS_INTENSITY');
    const newChannelsModule = { inject: {}, ...channelsModule };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject['fs:DECKGL_PROCESS_INTENSITY'] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return super.getShaders({
      vs,
      fs: fs
        .replace('_BEFORE_RENDER', _BEFORE_RENDER)
        .replace('_RENDER', _RENDER)
        .replace('_AFTER_RENDER', _AFTER_RENDER),
      defines: {
        SAMPLER_TYPE: sampler,
        NUM_PLANES: String(clippingPlanes.length || NUM_PLANES_DEFAULT)
      },
      modules: [newChannelsModule]
    });
  }

  /**
   * This function finalizes state by clearing all textures from the WebGL context
   */
  finalizeState() {
    super.finalizeState();

    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex?.delete());
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
      props.renderingMode !== oldProps.renderingMode ||
      props.clippingPlanes.length !== oldProps.clippingPlanes.length
    ) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
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
        topology: 'triangle-strip',
        attributes: {
          positions: new Float32Array(CUBE_STRIP)
        }
      })
    });
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw(opts) {
    const { uniforms } = opts;
    const { textures, model, scaleMatrix } = this.state;
    const {
      contrastLimits,
      xSlice,
      ySlice,
      zSlice,
      modelMatrix,
      channelsVisible,
      domain,
      dtype,
      clippingPlanes,
      resolutionMatrix
    } = this.props;
    const { viewMatrix, viewMatrixInverse, projectionMatrix } =
      this.context.viewport;
    if (textures && model && scaleMatrix) {
      const paddedContrastLimits = padContrastLimits({
        contrastLimits,
        channelsVisible,
        domain,
        dtype
      });
      const invertedScaleMatrix = scaleMatrix.clone().invert();
      const invertedResolutionMatrix = resolutionMatrix.clone().invert();
      const paddedClippingPlanes = padWithDefault(
        clippingPlanes.map(p =>
          p
            .clone()
            .transform(invertedScaleMatrix)
            .transform(invertedResolutionMatrix)
        ),
        new Plane([1, 0, 0]),
        clippingPlanes.length || NUM_PLANES_DEFAULT
      );
      // Need to flatten for shaders.
      const normals = paddedClippingPlanes.flatMap(plane => plane.normal);
      const distances = paddedClippingPlanes.map(plane => plane.distance);

      model.setUniforms(
        {
          ...uniforms,
          contrastLimits: paddedContrastLimits,
          xSlice: new Float32Array(
            xSlice
              ? xSlice.map(i => i / scaleMatrix[0] / resolutionMatrix[0])
              : [0, 1]
          ),
          ySlice: new Float32Array(
            ySlice
              ? ySlice.map(i => i / scaleMatrix[5] / resolutionMatrix[5])
              : [0, 1]
          ),
          zSlice: new Float32Array(
            zSlice
              ? zSlice.map(i => i / scaleMatrix[10] / resolutionMatrix[10])
              : [0, 1]
          ),
          eye_pos: new Float32Array([
            viewMatrixInverse[12],
            viewMatrixInverse[13],
            viewMatrixInverse[14]
          ]),
          view: viewMatrix,
          proj: projectionMatrix,
          scale: scaleMatrix,
          resolution: resolutionMatrix,
          model: modelMatrix || new Matrix4(),
          normals,
          distances
        },
        { disableWanings: false }
      );
      model.setBindings(textures);
      model.draw(opts);
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
      Object.values(this.state.textures).forEach(tex => tex?.delete());
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
      // null textures will throw errors, so we just set unused channels to the first texture for now.
      for (const key in textures) {
        if (!textures.volume0) throw new Error('Bad texture state!');
        if (!textures[key]) textures[key] = textures.volume0;
      }
      this.setState({
        textures,
        scaleMatrix: new Matrix4().scale(
          this.props.physicalSizeScalingMatrix.transformPoint([
            width,
            height,
            depth
          ])
        )
      });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height, depth) {
    const attrs = getRenderingAttrs();
    const texture = this.context.device.createTexture({
      width,
      height,
      depth,
      dimension: '3d',
      data: attrs.cast?.(data) ?? data,
      format: attrs.format,
      mipmaps: false,
      sampler: {
        minFilter: 'linear',
        magFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        addressModeW: 'clamp-to-edge'
      }
    });
    return texture;
  }
};

XR3DLayer.layerName = 'XR3DLayer';
XR3DLayer.defaultProps = defaultProps;
export default XR3DLayer;
