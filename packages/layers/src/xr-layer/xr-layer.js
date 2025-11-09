import { COORDINATE_SYSTEM, Layer, picking, project32 } from '@deck.gl/core';
// A lot of this codes inherits paradigms form DeckGL that
// we live in place for now, hence some of the not-destructuring
// ... needed to destructure for it to build with luma.gl 9, but we probably need to change these anyway
import { GL } from '@luma.gl/constants';
import { Geometry, Model } from '@luma.gl/engine';
import { ShaderAssembler } from '@luma.gl/shadertools';
import { padContrastLimits } from '../utils';
import channels from './shader-modules/channel-intensity';
import { getRenderingAttrs } from './utils';
import { MAX_CHANNELS } from '@vivjs/constants';
import VivShaderAssembler from './viv-shader-assembler';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  bounds: { type: 'array', value: [0, 0, 1, 1], compare: true },
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  interpolation: {
    type: 'string',
    value: 'nearest',
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<number>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {'nearest'|'linear'=} interpolation The `minFilter` and `magFilter` for luma.gl rendering (see https://luma.gl/docs/api-reference/core/resources/sampler#texture-magnification-filter) - default is 'nearest'
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const XRLayer = class extends Layer {
  /**
   * This function replaces `usampler` with `sampler` if the data is not an unsigned integer
   * and adds a standard ramp function default for DECKGL_PROCESS_INTENSITY.
   */
  getShaders() {
    const { dtype, interpolation } = this.props;
    const { shaderModule, sampler } = getRenderingAttrs(dtype, interpolation, MAX_CHANNELS);
    const extensionDefinesDeckglProcessIntensity =
      this._isHookDefinedByExtensions('fs:DECKGL_PROCESS_INTENSITY');
    const newChannelsModule = { ...channels, inject: {} };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject['fs:DECKGL_PROCESS_INTENSITY'] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return super.getShaders({
      ...shaderModule,
      defines: {
        SAMPLER_TYPE: sampler,
        NUM_CHANNELS: MAX_CHANNELS
      },
      modules: [project32, picking, newChannelsModule]
    });
  }

  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return extensions?.some(e => {
      const shaders = e.getShaders();
      const { inject = {}, modules = [] } = shaders;
      const definesInjection = inject[hookName];
      const moduleDefinesInjection = modules.some(m => m?.inject[hookName]);
      return definesInjection || moduleDefinesInjection;
    });
  }

  /**
   * This function initializes the internal state.
   */
  initializeState() {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    // -- this way of setting parameters is now deprecated and will be subject to further changes moving towards later luma.gl versions & WebGPU.
    // TODO - review this before merging!
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    const attributeManager = this.getAttributeManager();
    attributeManager.add({
      positions: {
        size: 3,
        type: 'float64',
        fp64: this.use64bitPositions(),
        update: this.calculatePositions,
        noAlloc: true
      }
    });
    this.setState({
      numInstances: 1,
      positions: new Float64Array(12)
    });
    // we may want to make our own subclass of ShaderAssembler with some extra logic to handle varying NUM_CHANNELS...
    // looks like a non-starter, goes against the grain somewhat... maybe if we make sure models will use it we might be ok?
    const shaderAssembler = VivShaderAssembler.getVivAssembler(MAX_CHANNELS);
    // const shaderAssembler = ShaderAssembler.getDefaultShaderAssembler();

    const mutateStr =
      'fs:DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)';
    const processStr =
      'fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)';
    // Only initialize shader hook functions _once globally_
    // Since the program manager is shared across all layers, but many layers
    // might be created, this solves the performance issue of always adding new
    // hook functions.
    // See https://github.com/kylebarron/deck.gl-raster/blob/2eb91626f0836558f0be4cd201ea18980d7f7f2d/src/deckgl/raster-layer/raster-layer.js#L21-L40
    // Note: _hookFunctions is private, not sure if there's an appropriate way to check if a hook function is already added.
    // it may be better to add these hooks somewhere else rather than in initializeState of a layer?
    if (!shaderAssembler._hookFunctions.includes(mutateStr)) {
      shaderAssembler.addShaderHook(mutateStr);
    }
    if (!shaderAssembler._hookFunctions.includes(processStr)) {
      shaderAssembler.addShaderHook(processStr);
    }
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
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // setup model first
    if (
      changeFlags.extensionsChanged ||
      props.interpolation !== oldProps.interpolation
    ) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });

      this.getAttributeManager().invalidateAll();
    }
    if (
      (props.channelData !== oldProps.channelData &&
        props.channelData?.data !== oldProps.channelData?.data) ||
      props.interpolation !== oldProps.interpolation
    ) {
      this.loadChannelTextures(props.channelData);
    }
    const attributeManager = this.getAttributeManager();
    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate('positions');
    }
    ///// this next section WIP attempt... not currently doing anything useful
    /// but not actively detrimental to the working of the app as long as the old
    /// uniforms are still being used and set as before.
    const { textures, model } = this.state;
    if (textures && model) {
      const { contrastLimits, domain, dtype, channelsVisible } = this.props;
      // Check number of textures not null.
      const numTextures = Object.values(textures).filter(t => t).length;
      // Slider values and color values can come in before textures since their data is async.
      // Thus we pad based on the number of textures bound.
      const paddedContrastLimits = padContrastLimits({
        contrastLimits: contrastLimits.slice(0, numTextures),
        channelsVisible: channelsVisible.slice(0, numTextures),
        domain,
        dtype
      });
      const xrLayer = {};
      for (let i = 0; i < MAX_CHANNELS; i++) {
        xrLayer[`contrastLimits${i}`] = [paddedContrastLimits[i*2], paddedContrastLimits[1 + i*2]];
      }
      //>>>> this is the problem I have currently, although it seems like what I pass here should be reasonable
      //webgl-render-pipeline.ts:412 luma.gl: Binding xrLayerUniforms not found in image-sub-layer-0,240,240,0-Background-Image-TiffPixelSource-#detail#-cached

      //it's expecting `const module = this.modules[moduleName];` (where moduleName is xrLayerUniforms)
      //but that isn't the name of a module.
      //>>> The best candidate in model.shaderInputs.modules is 'channel-intensity'.
      model.shaderInputs.setProps({
        xrLayerUniforms: xrLayer
      });
      model.setBindings(textures);
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
        topology: 'triangle-list',
        vertexCount: 6,
        indices: new Uint16Array([0, 1, 3, 1, 2, 3]),
        attributes: {
          texCoords: {
            value: new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]),
            size: 2
          }
        }
      }),
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      isInstanced: false,
      shaderAssembler: VivShaderAssembler.getVivAssembler(MAX_CHANNELS)
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

    attributes.value = positions;
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw(opts) {
    const { uniforms } = opts;
    const { textures, model } = this.state;
    if (textures && model) {
      const { contrastLimits, domain, dtype, channelsVisible } = this.props;
      // Check number of textures not null.
      const numTextures = Object.values(textures).filter(t => t).length;
      // Slider values and color values can come in before textures since their data is async.
      // Thus we pad based on the number of textures bound.
      const paddedContrastLimits = padContrastLimits({
        contrastLimits: contrastLimits.slice(0, numTextures),
        channelsVisible: channelsVisible.slice(0, numTextures),
        domain,
        dtype
      });
      // const xrLayer = {};
      // for (let i=0; i<MAX_CHANNELS; i++) {
      //   xrLayer[`contrastLimits${i}`] = paddedContrastLimits[i];
      // }
      // model.shaderInputs.setProps({
      //   xrLayerUniforms: xrLayer
      // });
      model.setUniforms(
        {
          ...uniforms,
          contrastLimits: paddedContrastLimits
        },
        { disableWarnings: false }
      );
      model.setBindings(textures);
      model.draw(this.context.renderPass);
    }
  }

  /**
   * This function loads all channel textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadChannelTextures(channelData) {
    // todo update for variable NUM_CHANNELS
    const textures = {
      channel0: null,
      channel1: null,
      channel2: null,
      channel3: null,
      channel4: null,
      channel5: null
    };
    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex?.delete());
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
      // null textures will throw errors, so we just set unused channels to the first texture for now.
      for (const key in textures) {
        if (!textures.channel0) throw new Error('Bad texture state!');
        if (!textures[key]) textures[key] = textures.channel0;
      }
      this.setState({ textures });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height) {
    const { interpolation } = this.props;
    const attrs = getRenderingAttrs(this.props.dtype, interpolation);

    return this.context.device.createTexture({
      width,
      height,
      dimension: '2d',
      data: attrs.cast?.(data) ?? data,
      // we don't want or need mimaps
      mipmaps: false,
      sampler: {
        // NEAREST for integer data
        minFilter: attrs.filter,
        magFilter: attrs.filter,
        // CLAMP_TO_EDGE to remove tile artifacts
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge'
      },
      format: attrs.format
    });
  }
};

XRLayer.layerName = 'XRLayer';
XRLayer.defaultProps = defaultProps;
export default XRLayer;
