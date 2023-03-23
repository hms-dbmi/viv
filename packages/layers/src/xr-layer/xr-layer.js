/* eslint-disable prefer-destructuring */
// A lot of this codes inherits paradigms form DeckGL that
// we live in place for now, hence some of the not-destructuring
import GL from '@luma.gl/constants';
import { COORDINATE_SYSTEM, Layer, project32, picking } from '@deck.gl/core';
import { Model, Geometry, Texture2D } from '@luma.gl/core';
import { ProgramManager } from '@luma.gl/engine';
import channels from './shader-modules/channel-intensity';
import { padContrastLimits } from '../utils';
import { getRenderingAttrs } from './utils';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  bounds: { type: 'array', value: [0, 0, 1, 1], compare: true },
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  interpolation: {
    type: 'number',
    value: GL.NEAREST,
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
 * @property {number=} interpolation The TEXTURE_MIN_FILTER and TEXTURE_MAG_FILTER for WebGL rendering (see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter) - default is GL.NEAREST
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
    const { shaderModule, sampler } = getRenderingAttrs(
      dtype,
      this.context.gl,
      interpolation
    );
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
        SAMPLER_TYPE: sampler
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
    const programManager = ProgramManager.getDefaultProgramManager(gl);

    const mutateStr =
      'fs:DECKGL_MUTATE_COLOR(inout vec4 rgba, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord)';
    const processStr = `fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)`;
    // Only initialize shader hook functions _once globally_
    // Since the program manager is shared across all layers, but many layers
    // might be created, this solves the performance issue of always adding new
    // hook functions.
    // See https://github.com/kylebarron/deck.gl-raster/blob/2eb91626f0836558f0be4cd201ea18980d7f7f2d/src/deckgl/raster-layer/raster-layer.js#L21-L40
    if (!programManager._hookFunctions.includes(mutateStr)) {
      programManager.addShaderHook(mutateStr);
    }
    if (!programManager._hookFunctions.includes(processStr)) {
      programManager.addShaderHook(processStr);
    }
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
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // setup model first
    if (
      changeFlags.extensionsChanged ||
      props.interpolation !== oldProps.interpolation
    ) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({ model: this._getModel(gl) });

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
      model
        .setUniforms({
          ...uniforms,
          contrastLimits: paddedContrastLimits,
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
    const { interpolation } = this.props;
    const attrs = getRenderingAttrs(
      this.props.dtype,
      this.context.gl,
      interpolation
    );
    return new Texture2D(this.context.gl, {
      width,
      height,
      data: attrs.cast?.(data) ?? data,
      // we don't want or need mimaps
      mipmaps: false,
      parameters: {
        // NEAREST for integer data
        [GL.TEXTURE_MIN_FILTER]: attrs.filter,
        [GL.TEXTURE_MAG_FILTER]: attrs.filter,
        // CLAMP_TO_EDGE to remove tile artifacts
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
      },
      format: attrs.format,
      dataFormat: attrs.dataFormat,
      type: attrs.type
    });
  }
};

XRLayer.layerName = 'XRLayer';
XRLayer.defaultProps = defaultProps;
export default XRLayer;
