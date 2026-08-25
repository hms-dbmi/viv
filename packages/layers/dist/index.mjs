import { OrthographicView, COORDINATE_SYSTEM, CompositeLayer, Layer, project32, picking } from '@deck.gl/core';
import { GL } from '@luma.gl/constants';
import { Matrix4 } from '@math.gl/core';
import { expandShaderModule, VivShaderAssembler, ColorPaletteExtension, ColorPalette3DExtensions, padColorsForUBO, getDefaultPalette } from '@vivjs/extensions';
import { isInterleaved, SIGNAL_ABORTED, getImageSize } from '@vivjs/loaders';
import { MAX_CHANNELS, DTYPE_VALUES, VIV_CHANNEL_INDEX_PLACEHOLDER, DEFAULT_FONT_FAMILY, VIV_PLANE_INDEX_PLACEHOLDER } from '@vivjs/constants';
import { BitmapLayer as BitmapLayer$1, PolygonLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import { Model, Geometry } from '@luma.gl/engine';
import { TileLayer } from '@deck.gl/geo-layers';
import { Plane } from '@math.gl/culling';

function range(len) {
  return [...Array(len).keys()];
}
function normalizeTextureBindings(textures, numChannelsRequired, keyPrefix = "channel") {
  if (numChannelsRequired === 0)
    return null;
  const keys = Object.keys(textures);
  const firstKey = `${keyPrefix}0`;
  const firstTexture = textures[firstKey];
  if (!firstTexture && keys.length === 0)
    return null;
  if (keys.length === numChannelsRequired)
    return textures;
  if (keys.length < numChannelsRequired && firstTexture) {
    const out = { ...textures };
    for (let i = 0; i < numChannelsRequired; i++) {
      const k = `${keyPrefix}${i}`;
      if (!out[k])
        out[k] = firstTexture;
    }
    return out;
  }
  if (keys.length > numChannelsRequired) {
    const out = {};
    for (let i = 0; i < numChannelsRequired; i++) {
      out[`${keyPrefix}${i}`] = textures[`${keyPrefix}${i}`];
    }
    return out;
  }
  return null;
}
function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}
function getDtypeValues(dtype) {
  const normalizedDtype = dtype.charAt(0).toUpperCase() + dtype.slice(1).toLowerCase();
  const values = DTYPE_VALUES[normalizedDtype];
  if (!values) {
    const valid = Object.keys(DTYPE_VALUES);
    throw Error(`Dtype not supported, got ${dtype}. Must be one of ${valid}.`);
  }
  return values;
}
function padContrastLimits({
  contrastLimits = [],
  channelsVisible,
  domain,
  dtype
}) {
  const maxSliderValue = domain?.[1] || getDtypeValues(dtype).max;
  const newContrastLimits = contrastLimits.map(
    (slider, i) => channelsVisible[i] ? slider : (
      /** @type {[number, number]} */
      [maxSliderValue, maxSliderValue]
    )
  );
  const padSize = MAX_CHANNELS - newContrastLimits.length;
  if (padSize < 0) {
    throw Error(
      `${newContrastLimits.length} channels passed in, but only ${MAX_CHANNELS} are allowed.`
    );
  }
  const paddedContrastLimits = padWithDefault(
    newContrastLimits,
    [maxSliderValue, maxSliderValue],
    padSize
  ).reduce((acc, val) => acc.concat(val), []);
  return paddedContrastLimits;
}
function getPhysicalSizeScalingMatrix(loader) {
  const { x, y, z } = loader?.meta?.physicalSizes ?? {};
  if (x?.size && y?.size && z?.size) {
    const min = Math.min(z.size, x.size, y.size);
    const ratio = [x.size / min, y.size / min, z.size / min];
    return new Matrix4().scale(ratio);
  }
  return new Matrix4().identity();
}
function makeBoundingBox(viewState) {
  const viewport = new OrthographicView().makeViewport({
    // From the current `detail` viewState, we need its projection matrix (actually the inverse).
    viewState,
    height: viewState.height,
    width: viewState.width
  });
  return [
    viewport.unproject([0, 0]),
    viewport.unproject([viewport.width, 0]),
    viewport.unproject([viewport.width, viewport.height]),
    viewport.unproject([0, viewport.height])
  ];
}
const TARGETS = [1, 2, 3, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1e3];
const MIN_TARGET = TARGETS[0];
const MAX_TARGET = TARGETS[TARGETS.length - 1];
const SI_PREFIXES = [
  { symbol: "Y", exponent: 24 },
  { symbol: "Z", exponent: 21 },
  { symbol: "E", exponent: 18 },
  { symbol: "P", exponent: 15 },
  { symbol: "T", exponent: 12 },
  { symbol: "G", exponent: 9 },
  { symbol: "M", exponent: 6 },
  { symbol: "k", exponent: 3 },
  { symbol: "h", exponent: 2 },
  { symbol: "da", exponent: 1 },
  { symbol: "", exponent: 0 },
  { symbol: "d", exponent: -1 },
  { symbol: "c", exponent: -2 },
  { symbol: "m", exponent: -3 },
  { symbol: "\xB5", exponent: -6 },
  { symbol: "n", exponent: -9 },
  { symbol: "p", exponent: -12 },
  { symbol: "f", exponent: -15 },
  { symbol: "a", exponent: -18 },
  { symbol: "z", exponent: -21 },
  { symbol: "y", exponent: -24 }
];
function sizeToMeters(size, unit) {
  if (!unit || unit === "m") {
    return size;
  }
  if (unit.length > 1) {
    let unitPrefix = unit.substring(0, unit.length - 1);
    if (unitPrefix === "u") {
      unitPrefix = "\xB5";
    }
    const unitObj = SI_PREFIXES.find((p) => p.symbol === unitPrefix);
    if (unitObj) {
      return size * 10 ** unitObj.exponent;
    }
  }
  throw new Error("Received unknown unit");
}
function snapValue(value) {
  let magnitude = 0;
  if (value < MIN_TARGET || value > MAX_TARGET) {
    magnitude = Math.floor(Math.log10(value));
  }
  let snappedUnit = SI_PREFIXES.find(
    (p) => p.exponent % 3 === 0 && p.exponent <= magnitude
  );
  let adjustedValue = value / 10 ** snappedUnit.exponent;
  if (adjustedValue > 500 && adjustedValue <= 1e3) {
    snappedUnit = SI_PREFIXES.find(
      (p) => p.exponent % 3 === 0 && p.exponent <= magnitude + 3
    );
    adjustedValue = value / 10 ** snappedUnit.exponent;
  }
  const targetNewUnits = TARGETS.find((t) => t > adjustedValue);
  const targetOrigUnits = targetNewUnits * 10 ** snappedUnit.exponent;
  return [targetOrigUnits, targetNewUnits, snappedUnit.symbol];
}
function addAlpha(array) {
  if (!(array instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array");
  }
  const alphaArray = new Uint8Array(array.length + array.length / 3);
  for (let i = 0; i < array.length / 3; i += 1) {
    alphaArray[i * 4] = array[i * 3];
    alphaArray[i * 4 + 1] = array[i * 3 + 1];
    alphaArray[i * 4 + 2] = array[i * 3 + 2];
    alphaArray[i * 4 + 3] = 255;
  }
  return alphaArray;
}

const PHOTOMETRIC_INTERPRETATIONS = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  TransparencyMask: 4,
  CMYK: 5,
  YCbCr: 6,
  CIELab: 8,
  ICCLab: 9
};
const defaultProps$8 = {
  ...BitmapLayer$1.defaultProps,
  pickable: { type: "boolean", value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
};
const getPhotometricInterpretationShader = (photometricInterpretation, transparentColorInHook) => {
  const useTransparentColor = transparentColorInHook ? "true" : "false";
  const transparentColorVector = `vec3(${(transparentColorInHook || [0, 0, 0]).map((i) => String(i / 255)).join(",")})`;
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return `color[3] = (${useTransparentColor} && (color.rgb == ${transparentColorVector})) ? 0.0 : color.a;`;
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return `          float value = 1.0 - (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return `          float value = (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      return `          float y = color[0];
          float cb = color[1];
          float cr = color[2];
          color[0] = (y + (1.40200 * (cr - .5)));
          color[1] = (y - (0.34414 * (cb - .5)) - (0.71414 * (cr - .5)));
          color[2] = (y + (1.77200 * (cb - .5)));
          color[3] = (${useTransparentColor} && distance(color.rgb, ${transparentColorVector}) < 0.01) ? 0.0 : color.a;
        `;
    default:
      console.error(
        "Unsupported photometric interpretation or none provided.  No transformation will be done to image data"
      );
      return "";
  }
};
const getTransparentColor = (photometricInterpretation) => {
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return [255, 255, 255, 0];
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      return [16, 128, 128, 0];
    default:
      console.error(
        "Unsupported photometric interpretation or none provided.  No transformation will be done to image data"
      );
      return [0, 0, 0, 0];
  }
};
const getPreparedImage = (img) => {
  if (!img?.data || !img.width || !img.height) {
    return null;
  }
  const data = img.data && img.data.length === img.width * img.height * 3 ? addAlpha(img.data) : img.data;
  return { ...img, data };
};
class BitmapLayerWrapper extends BitmapLayer$1 {
  _getModel(gl) {
    const { photometricInterpretation, transparentColorInHook } = this.props;
    const photometricInterpretationShader = getPhotometricInterpretationShader(
      photometricInterpretation,
      transparentColorInHook
    );
    const numChannels = this.props.selections?.length || 1;
    return new Model(this.context.device, {
      ...expandShaderModule(this.getShaders(), numChannels),
      id: this.props.id,
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      topology: "triangle-list",
      isInstanced: false,
      inject: {
        "fs:DECKGL_FILTER_COLOR": photometricInterpretationShader
      },
      shaderAssembler: VivShaderAssembler.getDefaultVivShaderAssembler()
    });
  }
}
const BitmapLayer = class extends CompositeLayer {
  initializeState(args) {
    const { device } = this.context;
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    super.initializeState(args);
  }
  renderLayers() {
    const {
      photometricInterpretation,
      transparentColor: transparentColorInHook
    } = this.props;
    const transparentColor = getTransparentColor(photometricInterpretation);
    const image = getPreparedImage(this.props.image);
    if (!image)
      return null;
    return new BitmapLayerWrapper(
      { ...this.props, image },
      {
        transparentColor,
        transparentColorInHook,
        id: `${this.props.id}-wrapped`
      }
    );
  }
};
BitmapLayer.layerName = "BitmapLayer";
BitmapLayer.PHOTOMETRIC_INTERPRETATIONS = PHOTOMETRIC_INTERPRETATIONS;
BitmapLayer.defaultProps = {
  ...defaultProps$8,
  // We don't want this layer to bind the texture so the type should not be `image`.
  image: { type: "object", value: {}, compare: true },
  transparentColor: { type: "array", value: [0, 0, 0], compare: true },
  photometricInterpretation: { type: "number", value: 2, compare: true }
};
BitmapLayerWrapper.defaultProps = defaultProps$8;
BitmapLayerWrapper.layerName = "BitmapLayerWrapper";

const moduleName$3 = "channelIntensity";
const fs$4 = `uniform ${moduleName$3}Uniforms {
  vec2 contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER};
} ${moduleName$3};

float apply_contrast_limits(float intensity, vec2 contrastLimits) {
    return  max(0., (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0])));
}
`;
const channels = {
  name: moduleName$3,
  uniformTypes: {
    [`contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec2<f32>"
  },
  defines: {
    SAMPLER_TYPE: "usampler2D",
    COLORMAP_FUNCTION: ""
  },
  fs: fs$4
};

const fs$3 = `#version 300 es
#define SHADER_NAME xr-layer-fragment-shader
precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// our texture
uniform SAMPLER_TYPE channel${VIV_CHANNEL_INDEX_PLACEHOLDER};

in vec2 vTexCoord;

out vec4 fragColor;

void main() {

  float intensity${VIV_CHANNEL_INDEX_PLACEHOLDER} = float(texture(channel${VIV_CHANNEL_INDEX_PLACEHOLDER}, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity${VIV_CHANNEL_INDEX_PLACEHOLDER}, channelIntensity.contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER}, ${VIV_CHANNEL_INDEX_PLACEHOLDER});
  // DECKGL_PROCESS_INTENSITY(intensity${VIV_CHANNEL_INDEX_PLACEHOLDER}, xrLayer.contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER}, ${VIV_CHANNEL_INDEX_PLACEHOLDER});

  float[] intensity = float[NUM_CHANNELS](
    // as of this writing, this will be expanded by some very fragile string processing to remove final comma...
    // needs documenting and hopefully improving.
    intensity${VIV_CHANNEL_INDEX_PLACEHOLDER},
  );
  DECKGL_MUTATE_COLOR(fragColor, intensity, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;

const vs$1 = `#version 300 es
#define SHADER_NAME xr-layer-vertex-shader

in vec2 texCoords;
in vec3 positions;
in vec3 positions64Low;
in vec3 instancePickingColors;
out vec2 vTexCoord;

void main(void) {
  geometry.worldPosition = positions;
  geometry.uv = texCoords;
  geometry.pickingColor = instancePickingColors;
  gl_Position = project_position_to_clipspace(positions, positions64Low, vec3(0.), geometry.position);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  vTexCoord = texCoords;
  vec4 color = vec4(0.);
  DECKGL_FILTER_COLOR(color, geometry);
}
`;

const coreShaderModule = { fs: fs$3, vs: vs$1, name: "xrLayer" };
function getRenderingAttrs$1(dtype, interpolation, numChannels = MAX_CHANNELS) {
  //!!! todo review whether we really need to be storing data as f32 - probably not.
  const isLinear = interpolation === "linear";
  const values = getDtypeValues(isLinear ? "Float32" : dtype);
  return {
    // maybe we should do this in XRLayer instead
    shaderModule: expandShaderModule({ ...coreShaderModule }, numChannels),
    filter: interpolation,
    cast: isLinear ? (data) => new Float32Array(data) : (data) => data,
    ...values
  };
}

const defaultProps$7 = {
  pickable: { type: "boolean", value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: "object", value: {}, compare: true },
  bounds: { type: "array", value: [0, 0, 1, 1], compare: true },
  contrastLimits: { type: "array", value: [], compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  dtype: { type: "string", value: "Uint16", compare: true },
  interpolation: {
    type: "string",
    value: "nearest",
    compare: true
  },
  // Extension props are merged into layer props, but declaring them here
  // ensures deck.gl tracks them for change detection(?)
  colormap: { type: "string", value: null, compare: true }
};
class XRLayer extends Layer {
  /**
   * Returns the number of channels for this layer instance.
   * Implements VivLayer interface.
   */
  getNumChannels() {
    return this.props.selections?.length ?? this.props.channels?.length ?? MAX_CHANNELS;
  }
  /**
   * Returns the number of planes for this layer instance (always 1 for 2D layers).
   * Implements VivLayer interface.
   */
  getNumPlanes() {
    return 1;
  }
  /**
   * This function replaces `usampler` with `sampler` if the data is not an unsigned integer
   * and adds a standard ramp function default for DECKGL_PROCESS_INTENSITY.
   */
  getShaders() {
    const { dtype, interpolation } = this.props;
    const numChannels = this.getNumChannels();
    const { shaderModule, sampler } = getRenderingAttrs$1(
      dtype,
      interpolation,
      numChannels
    );
    const extensionDefinesDeckglProcessIntensity = this._isHookDefinedByExtensions("fs:DECKGL_PROCESS_INTENSITY");
    const expandedChannels = expandShaderModule(channels, numChannels);
    const newChannelsModule = { ...expandedChannels, inject: {} };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject["fs:DECKGL_PROCESS_INTENSITY"] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return expandShaderModule(
      super.getShaders({
        ...shaderModule,
        defines: {
          SAMPLER_TYPE: sampler
        },
        modules: [project32, picking, newChannelsModule]
      }),
      numChannels
    );
  }
  // may consider reviewing this along with other extension stuff.
  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return extensions?.some((e) => {
      const shaders = e.getShaders.call(this, e);
      const { inject = {}, modules = [] } = shaders;
      const definesInjection = inject[hookName];
      const moduleDefinesInjection = modules.some((m) => m?.inject[hookName]);
      return definesInjection || moduleDefinesInjection;
    });
  }
  /**
   * This function initializes the internal state.
   */
  initializeState() {
    const { device } = this.context;
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    const attributeManager = this.getAttributeManager();
    attributeManager.add({
      positions: {
        size: 3,
        type: "float64",
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
      Object.values(this.state.textures).forEach((tex) => tex?.delete());
    }
  }
  /**
   * This function updates state by retriggering model creation (shader compilation and attribute binding)
   * and loading any textures that need be loading.
   */
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    const numChannels = this.getNumChannels();
    if (numChannels === 0) {
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: null });
      }
      return;
    }
    const colormapChanged = props.colormap !== oldProps?.colormap;
    if (changeFlags.extensionsChanged || props.interpolation !== oldProps.interpolation || colormapChanged || (props.selections?.length ?? 0) !== (oldProps.selections?.length ?? 0)) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
      this.getAttributeManager().invalidateAll();
    }
    if (props.channelData !== oldProps.channelData && props.channelData?.data !== oldProps.channelData?.data || props.interpolation !== oldProps.interpolation) {
      this.loadChannelTextures(props.channelData);
    }
    const attributeManager = this.getAttributeManager();
    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate("positions");
    }
    const texturesToBind = this._newTexturesFromLoadThisFrame ?? this.state.textures;
    const { model } = this.state;
    const bindings = texturesToBind && model ? normalizeTextureBindings(texturesToBind, numChannels, "channel") : null;
    if (bindings) {
      const { contrastLimits, domain, dtype, channelsVisible } = this.props;
      const paddedContrastLimits = padContrastLimits({
        contrastLimits: contrastLimits.slice(0, numChannels),
        channelsVisible: channelsVisible.slice(0, numChannels),
        domain,
        dtype
      });
      const channelIntensity = {};
      for (let i = 0; i < numChannels; i++) {
        channelIntensity[`contrastLimits${i}`] = [
          paddedContrastLimits[i * 2],
          paddedContrastLimits[i * 2 + 1]
        ];
      }
      model.shaderInputs.setProps({ channelIntensity });
      model.setBindings(bindings);
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
      id: this.props.id,
      geometry: new Geometry({
        topology: "triangle-list",
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
      shaderAssembler: VivShaderAssembler.getDefaultVivShaderAssembler()
    });
  }
  /**
   * This function generates view positions for use as a vec3 in the shader
   */
  calculatePositions(attributes) {
    const { positions } = this.state;
    const { bounds } = this.props;
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
   * Track textures that were created during the current frame.
   * These textures are used by `updateState` to bind same-frame textures
   * and avoid referencing textures that may have been deleted when channels
   * are removed and then added back.
   *
   * @param {Record<string, import('@luma.gl/core').Texture>|null} textures - Map of channel ids
   *   (e.g. `channel0`, `channel1`) to textures created this frame, or null
   *   when no channel textures were loaded.
   * @private
   */
  _setNewTexturesFromLoadThisFrame(textures) {
    this._newTexturesFromLoadThisFrame = textures;
  }
  /**
   * This function loads all channel textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadChannelTextures(channelData) {
    const numChannels = this.getNumChannels();
    const textures = {};
    for (let i = 0; i < numChannels; i++) {
      textures[`channel${i}`] = null;
    }
    if (this.state.textures) {
      Object.values(this.state.textures).forEach((tex) => tex?.delete());
    }
    if (channelData && Object.keys(channelData).length > 0 && channelData.data) {
      channelData.data.forEach((d, i) => {
        textures[`channel${i}`] = this.dataToTexture(
          d,
          channelData.width,
          channelData.height
        );
      }, this);
      for (const key in textures) {
        if (!textures.channel0)
          throw new Error("Bad texture state!");
        if (!textures[key])
          textures[key] = textures.channel0;
      }
      this._setNewTexturesFromLoadThisFrame(textures);
      this.setState({ textures });
    } else {
      this._setNewTexturesFromLoadThisFrame(null);
    }
  }
  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height) {
    const { interpolation } = this.props;
    const attrs = getRenderingAttrs$1(this.props.dtype, interpolation);
    return this.context.device.createTexture({
      width,
      height,
      dimension: "2d",
      data: attrs.cast?.(data) ?? data,
      // we don't want or need mimaps
      mipmaps: false,
      sampler: {
        // NEAREST for integer data
        minFilter: attrs.filter,
        magFilter: attrs.filter,
        // CLAMP_TO_EDGE to remove tile artifacts
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge"
      },
      format: attrs.format
    });
  }
}
XRLayer.layerName = "XRLayer";
XRLayer.defaultProps = defaultProps$7;

const defaultProps$6 = {
  pickable: { type: "boolean", value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  // similar things also declared in several other places & we may end up re-arranging somewhat?
  contrastLimits: { type: "array", value: [], compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  selections: { type: "array", value: [], compare: true },
  domain: { type: "array", value: [], compare: true },
  viewportId: { type: "string", value: "", compare: true },
  loader: {
    type: "object",
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      dtype: "Uint16",
      shape: []
    },
    compare: true
  },
  onClick: { type: "function", value: null, compare: true },
  onViewportLoad: { type: "function", value: null, compare: true },
  interpolation: {
    type: "number",
    value: "nearest",
    compare: true
  },
  extensions: {
    type: "array",
    value: [new ColorPaletteExtension()],
    compare: true
  }
};
const ImageLayer = class extends CompositeLayer {
  /**
   * Returns the number of channels for this layer instance.
   * Implements VivLayer interface.
   */
  getNumChannels() {
    return this.props.selections?.length ?? this.props.channels?.length ?? MAX_CHANNELS;
  }
  /**
   * Returns the number of planes for this layer instance (always 1 for 2D layers).
   * Implements VivLayer interface.
   */
  getNumPlanes() {
    return 1;
  }
  finalizeState() {
    this.state.abortController.abort();
  }
  updateState({ props, oldProps }) {
    const loaderChanged = props.loader !== oldProps.loader;
    const selectionsChanged = props.selections !== oldProps.selections;
    if (loaderChanged || selectionsChanged) {
      const { loader, selections = [], onViewportLoad } = this.props;
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const getRaster = (selection) => loader.getRaster({ selection, signal });
      const dataPromises = selections.map(getRaster);
      Promise.all(dataPromises).then((rasters) => {
        const raster = {
          data: rasters.map((d) => d.data),
          width: rasters[0]?.width,
          height: rasters[0]?.height
        };
        if (isInterleaved(loader.shape)) {
          raster.data = raster.data[0];
          if (raster.data.length === raster.width * raster.height * 3) {
            raster.format = "rgba8unorm";
          }
        }
        if (onViewportLoad) {
          onViewportLoad(raster);
        }
        this.setState({ ...raster });
      }).catch((e) => {
        if (e !== SIGNAL_ABORTED) {
          throw e;
        }
      });
    }
  }
  getPickingInfo({ info, sourceLayer }) {
    info.sourceLayer = sourceLayer;
    info.tile = sourceLayer.props.tile;
    return info;
  }
  renderLayers() {
    const { loader, id } = this.props;
    const { dtype } = loader;
    const { width, height, data } = this.state;
    if (!(width && height))
      return null;
    const bounds = [0, height, width, 0];
    if (isInterleaved(loader.shape)) {
      const { photometricInterpretation = 2 } = loader.meta;
      return new BitmapLayer(this.props, {
        image: this.state,
        photometricInterpretation,
        // Shared props with XRLayer:
        bounds,
        id: `image-sub-layer-${bounds}-${id}`,
        extensions: []
      });
    }
    return new XRLayer(this.props, {
      channelData: { data, height, width },
      // Shared props with BitmapLayer:
      bounds,
      id: `image-sub-layer-${bounds}-${id}`,
      dtype
    });
  }
};
ImageLayer.layerName = "ImageLayer";
ImageLayer.defaultProps = defaultProps$6;

function renderSubLayers(props) {
  const {
    bbox: { left, top },
    index: { x, y, z }
  } = props.tile;
  const { data, id, loader, maxZoom } = props;
  if ([left, top].some((v) => v < 0) || !data) {
    return null;
  }
  if (data.width === 0 || data.height === 0) {
    return null;
  }
  const base = loader[0];
  const scale = 2 ** Math.round(-z);
  const bounds = [
    left,
    top + data.height * scale,
    left + data.width * scale,
    top
  ];
  if (isInterleaved(base.shape)) {
    const { photometricInterpretation = 2 } = base.meta;
    return new BitmapLayer(props, {
      image: data,
      photometricInterpretation,
      // Shared props with XRLayer:
      bounds,
      id: `tile-sub-layer-${bounds}-${id}`,
      tileId: { x, y, z },
      extensions: []
    });
  }
  return new XRLayer(props, {
    channelData: data,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    // Shared props with BitmapLayer:
    bounds,
    id: `tile-sub-layer-${bounds}-${id}`,
    tileId: { x, y, z },
    // The auto setting is NEAREST at the highest resolution but LINEAR otherwise.
    interpolation: z === maxZoom ? "nearest" : "linear"
  });
}

const defaultProps$5 = {
  pickable: { type: "boolean", value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: "array", value: [], compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  renderSubLayers: { type: "function", value: renderSubLayers, compare: false },
  dtype: { type: "string", value: "Uint16", compare: true },
  domain: { type: "array", value: [], compare: true },
  viewportId: { type: "string", value: "", compare: true },
  interpolation: { type: "number", value: null, compare: true }
};
class MultiscaleImageLayerBase extends TileLayer {
  /**
   * This function allows us to controls which viewport gets to update the Tileset2D.
   * This is a uniquely TileLayer issue since it updates based on viewport updates thanks
   * to its ability to handle zoom-pan loading.  Essentially, with a picture-in-picture,
   * this prevents it from detecting the update of some other viewport that is unwanted.
   */
  _updateTileset() {
    if (!this.props.viewportId) {
      super._updateTileset();
    }
    if (this.props.viewportId && this.context.viewport.id === this.props.viewportId || // I don't know why, but DeckGL doesn't recognize multiple views on the first pass
    // so we force update on the first pass by checking if there is a viewport in the tileset.
    !this.state.tileset._viewport) {
      super._updateTileset();
    }
  }
}
MultiscaleImageLayerBase.layerName = "MultiscaleImageLayerBase";
MultiscaleImageLayerBase.defaultProps = defaultProps$5;

const defaultProps$4 = {
  pickable: { type: "boolean", value: true, compare: true },
  onHover: { type: "function", value: null, compare: false },
  contrastLimits: { type: "array", value: [], compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  domain: { type: "array", value: [], compare: true },
  viewportId: { type: "string", value: "", compare: true },
  maxRequests: { type: "number", value: 10, compare: true },
  onClick: { type: "function", value: null, compare: true },
  refinementStrategy: { type: "string", value: null, compare: true },
  excludeBackground: { type: "boolean", value: false, compare: true },
  extensions: {
    type: "array",
    value: [new ColorPaletteExtension()],
    compare: true
  }
};
const MultiscaleImageLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      selections,
      opacity,
      viewportId,
      onTileError,
      onHover,
      id,
      onClick,
      modelMatrix,
      excludeBackground,
      refinementStrategy
    } = this.props;
    const { tileSize, dtype } = loader[0];
    const getTileData = async ({ index: { x, y, z }, signal }) => {
      if (!selections || selections.length === 0) {
        return null;
      }
      const resolution = Math.round(-z);
      const getTile = (selection) => {
        const config = { x, y, selection, signal };
        return loader[resolution].getTile(config);
      };
      try {
        const tiles = await Promise.all(selections.map(getTile));
        const tile = {
          data: tiles.map((d) => d.data),
          width: tiles[0].width,
          height: tiles[0].height
        };
        if (isInterleaved(loader[resolution].shape)) {
          tile.data = tile.data[0];
          if (tile.data.length === tile.width * tile.height * 3) {
            tile.format = "rgba8unorm";
          }
          return tile;
        }
        return tile;
      } catch (err) {
        if (err === SIGNAL_ABORTED) {
          return null;
        }
        throw err;
      }
    };
    const { height, width } = getImageSize(loader[0]);
    const tiledLayer = new MultiscaleImageLayerBase(this.props, {
      id: `Tiled-Image-${id}`,
      getTileData,
      dtype,
      tileSize,
      // If you scale a matrix up or down, that is like zooming in or out.  zoomOffset controls
      // how the zoom level you fetch tiles at is offset, allowing us to fetch higher resolution tiles
      // while at a lower "absolute" zoom level.  If you didn't use this prop, an image that is scaled
      // up would always look "low resolution" no matter the level of the image pyramid you are looking at.
      zoomOffset: Math.round(
        Math.log2(modelMatrix ? modelMatrix.getScale()[0] : 1)
      ),
      extent: [0, 0, width, height],
      // See the above note within for why the use of zoomOffset and the rounding necessary.
      minZoom: Math.round(-(loader.length - 1)),
      maxZoom: 0,
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy: refinementStrategy || (opacity === 1 ? "best-available" : "no-overlap"),
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader, selections]
      },
      onTileError: onTileError || loader[0].onTileError
    });
    const lowestResolution = loader[loader.length - 1];
    const implementsGetRaster = typeof lowestResolution.getRaster === "function";
    const layerModelMatrix = modelMatrix ? modelMatrix.clone() : new Matrix4();
    const baseLayer = implementsGetRaster && !excludeBackground && new ImageLayer(this.props, {
      id: `Background-Image-${id}`,
      loader: lowestResolution,
      modelMatrix: layerModelMatrix.scale(2 ** (loader.length - 1)),
      visible: !viewportId || this.context.viewport.id === viewportId,
      onHover,
      onClick,
      // Background image is nicest when LINEAR in my opinion.
      interpolation: "linear",
      onViewportLoad: null
    });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
};
MultiscaleImageLayer.layerName = "MultiscaleImageLayer";
MultiscaleImageLayer.defaultProps = defaultProps$4;

const defaultProps$3 = {
  pickable: { type: "boolean", value: true, compare: true },
  loader: {
    type: "object",
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      getRasterSize: () => ({ height: 0, width: 0 }),
      dtype: "<u2"
    },
    compare: true
  },
  id: { type: "string", value: "", compare: true },
  boundingBox: {
    type: "array",
    value: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ],
    compare: true
  },
  boundingBoxColor: { type: "array", value: [255, 0, 0], compare: true },
  boundingBoxOutlineWidth: { type: "number", value: 1, compare: true },
  viewportOutlineColor: { type: "array", value: [255, 190, 0], compare: true },
  viewportOutlineWidth: { type: "number", value: 2, compare: true },
  overviewScale: { type: "number", value: 1, compare: true },
  zoom: { type: "number", value: 1, compare: true },
  extensions: {
    type: "array",
    value: [new ColorPaletteExtension()],
    compare: true
  }
};
const OverviewLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      zoom,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    } = this.props;
    const { width, height } = getImageSize(loader[0]);
    const z = loader.length - 1;
    const lowestResolution = loader[z];
    const overview = new ImageLayer(this.props, {
      id: `viewport-${id}`,
      modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
      loader: lowestResolution
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: "cartesian",
      data: [boundingBox],
      getPolygon: (f) => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth * 2 ** zoom
    });
    const viewportOutline = new PolygonLayer({
      id: `viewport-outline-${id}`,
      coordinateSystem: "cartesian",
      data: [
        [
          [0, 0],
          [width * overviewScale, 0],
          [width * overviewScale, height * overviewScale],
          [0, height * overviewScale]
        ]
      ],
      getPolygon: (f) => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** zoom
    });
    const layers = [overview, boundingBoxOutline, viewportOutline];
    return layers;
  }
};
OverviewLayer.layerName = "OverviewLayer";
OverviewLayer.defaultProps = defaultProps$3;

const defaultProps$2 = {
  pickable: { type: "boolean", value: true, compare: true },
  imageViewState: {
    type: "object",
    value: { zoom: 0, target: [0, 0, 0], width: 1, height: 1 },
    compare: true
  },
  unit: { type: "string", value: "", compare: true },
  size: { type: "number", value: 1, compare: true },
  position: { type: "string", value: "bottom-right", compare: true },
  length: { type: "number", value: 0.085, compare: true },
  snap: { type: "boolean", value: false, compare: true }
};
const ScaleBarLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      id,
      unit,
      size,
      position,
      imageViewState,
      length,
      snap,
      height,
      width
    } = this.props;
    const boundingBox = makeBoundingBox(imageViewState);
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    const barLength = viewLength * 0.05;
    const barScreenLength = barLength * 2 ** imageViewState.zoom;
    const barHeight = 10;
    let displayNumber = (barLength * size).toPrecision(5);
    let displayUnit = unit;
    let adjustedBarLength = barScreenLength;
    if (snap) {
      const meterSize = sizeToMeters(size, unit);
      const numUnits = barLength * meterSize;
      const [snappedOrigUnits, snappedNewUnits, snappedUnitPrefix] = snapValue(numUnits);
      displayNumber = snappedNewUnits;
      displayUnit = `${snappedUnitPrefix}m`;
      adjustedBarLength = snappedOrigUnits / meterSize * 2 ** imageViewState.zoom;
    }
    let xLeftCoord;
    let yCoord;
    const isLeft = position.endsWith("-left");
    switch (position) {
      case "bottom-right":
        yCoord = height - height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case "bottom-left":
        yCoord = height - height * length;
        xLeftCoord = width * length;
        break;
      case "top-right":
        yCoord = height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case "top-left":
        yCoord = height * length;
        xLeftCoord = width * length;
        break;
      default:
        throw new Error(`Position ${position} not found`);
    }
    const xRightCoord = xLeftCoord + adjustedBarLength;
    const lengthBar = new LineLayer({
      id: `scale-bar-length-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [isLeft ? xLeftCoord : xRightCoord - adjustedBarLength, yCoord],
          [isLeft ? xLeftCoord + adjustedBarLength : xRightCoord, yCoord]
        ]
      ],
      getSourcePosition: (d) => d[0],
      getTargetPosition: (d) => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsLeft = new LineLayer({
      id: `scale-bar-height-left-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: (d) => d[0],
      getTargetPosition: (d) => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsRight = new LineLayer({
      id: `scale-bar-height-right-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: (d) => d[0],
      getTargetPosition: (d) => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const textLayer = new TextLayer({
      id: `units-label-layer-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        {
          text: `${displayNumber}${displayUnit}`,
          position: [isLeft ? xLeftCoord : xRightCoord, yCoord - barHeight * 2]
        }
      ],
      getTextAnchor: isLeft ? "start" : "end",
      getColor: [220, 220, 220, 255],
      getSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      sizeUnits: "pixels",
      sizeScale: 1,
      characterSet: [
        ...displayUnit.split(""),
        ...range(10).map((i) => String(i)),
        ".",
        "e",
        "+"
      ]
    });
    return [lengthBar, tickBoundsLeft, tickBoundsRight, textLayer];
  }
};
ScaleBarLayer.layerName = "ScaleBarLayer";
ScaleBarLayer.defaultProps = defaultProps$2;

const fs$2 = `#version 300 es
precision highp int;
precision highp float;
precision highp SAMPLER_TYPE;

uniform highp SAMPLER_TYPE volume${VIV_CHANNEL_INDEX_PLACEHOLDER};

in vec3 vray_dir;
flat in vec3 transformed_eye;
out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir) {
	vec3 box_min = vec3(fragmentUniforms3D.xSlice[0], fragmentUniforms3D.ySlice[0], fragmentUniforms3D.zSlice[0]);
	vec3 box_max = vec3(fragmentUniforms3D.xSlice[1], fragmentUniforms3D.ySlice[1], fragmentUniforms3D.zSlice[1]);
	vec3 inv_dir = 1. / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  vec2 val = vec2(t0, t1);
	return val;
}

float linear_to_srgb(float x) {
	if (x <= 0.0031308f) {
		return 12.92f * x;
	}
	return 1.055f * pow(x, 1.f / 2.4f) - 0.055f;
}

// Pseudo-random number gen from
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/
// with some tweaks for the range of values
float wang_hash(int seed) {
	seed = (seed ^ 61) ^ (seed >> 16);
	seed *= 9;
	seed = seed ^ (seed >> 4);
	seed *= 0x27d4eb2d;
	seed = seed ^ (seed >> 15);
	return float(seed % 2147483647) / float(2147483647);
}


void main(void) {
	// Step 1: Normalize the view ray
	vec3 ray_dir = normalize(vray_dir);

	// Step 2: Intersect the ray with the volume bounds to find the interval
	// along the ray overlapped by the volume.
	vec2 t_hit = intersect_box(transformed_eye, ray_dir);
	if (t_hit.x > t_hit.y) {
		discard;
	}
	// We don't want to sample voxels behind the eye if it's
	// inside the volume, so keep the starting point at or in front
	// of the eye
	t_hit.x = max(t_hit.x, 0.);

	// Step 3: Compute the step size to march through the volume grid
	vec3 dt_vec = 1. / (fragmentUniforms3D.scale * vec4(abs(ray_dir), 1.)).xyz;
	float dt = 1. * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

	float offset = wang_hash(int(gl_FragCoord.x + 640. * gl_FragCoord.y));

	// Step 4: Starting from the entry point, march the ray through the volume
	// and sample it
	vec3 p = transformed_eye + (t_hit.x + offset * dt) * ray_dir;
	
	#define _U fragmentUniforms3D
	_BEFORE_RENDER

	// TODO: Probably want to stop this process at some point to improve performance when marching down the edges.
	for (float t = t_hit.x; t < t_hit.y; t += dt) {
		// Check if this point is on the "positive" side or "negative" side of the plane - only show positive.
		float canShow = 1.;
		canShow *= max(0., sign(dot(_U.normal${VIV_PLANE_INDEX_PLACEHOLDER}, p) + _U.distance${VIV_PLANE_INDEX_PLACEHOLDER}));
		// Do not show coordinates outside 0-1 box.
		// Something about the undefined behavior outside the box causes the additive blender to 
		// render some very odd artifacts.
		float canShowXCoordinate = max(p.x - 0., 0.) * max(1. - p.x , 0.);
		float canShowYCoordinate = max(p.y - 0., 0.) * max(1. - p.y , 0.);
		float canShowZCoordinate = max(p.z - 0., 0.) * max(1. - p.z , 0.);
		float canShowCoordinate = float(ceil(canShowXCoordinate * canShowYCoordinate * canShowZCoordinate));
		canShow = canShowCoordinate * canShow;
		float intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER} = float(texture(volume${VIV_CHANNEL_INDEX_PLACEHOLDER}, p).r);
		DECKGL_PROCESS_INTENSITY(intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER}, channelIntensity3D.contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER}, ${VIV_CHANNEL_INDEX_PLACEHOLDER});
		intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER} = canShow * intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER};


		_RENDER

		p += ray_dir * dt;
	}
	_AFTER_RENDER
  color.r = linear_to_srgb(color.r);
  color.g = linear_to_srgb(color.g);
  color.b = linear_to_srgb(color.b);
}
`;

const vs = `#version 300 es
#define SHADER_NAME xr-layer-vertex-shader

// Unit-cube vertices
in vec3 positions;

uniform vertexUniforms {
  // Eye position - last column of the inverted view matrix  
  vec3 eye_pos;
  mat4 proj;
  mat4 model;
  mat4 view;
  // A matrix for scaling in the model space before any transformations.
  // This projects the unit cube up to match the "pixel size" multiplied by the physical size ratio, if provided.
  mat4 scale;
  mat4 resolution;
} vertex;

out vec3 vray_dir;
flat out vec3 transformed_eye;

void main() {

  // Step 1: Standard MVP transformation (+ the scale matrix) to place the positions on your 2D screen ready for rasterization + fragment processing.
  gl_Position = vertex.proj * vertex.view * vertex.model * vertex.scale * vertex.resolution * vec4(positions, 1.);

  // Step 2: Invert the eye back from world space to the normalized 0-1 cube world space because ray casting on the fragment shader runs in 0-1 space.
  // Geometrically, the transformed_eye is a position relative to the 0-1 normalized vertices, which themselves are the inverse of the model + scale trasnformation.
  // See below for an example which does not involve a scale transformation, for simplicity, but motivates geometrically the needed transformation on eye_pos.
  /*
  This first diagram is a skewed volume (i.e a "shear" model matrix applied) top down with the eye marked as #, all in world space
       ^
    ___|__
    \\  |  \\
     \\ |   \\
      \\|____\\
       | 
       | 
       |
       #

  This next diagram shows the volume after the inverse model matrix has placed it back in model coordinates, but the eye still in world space. 
       ^
    ___|___
    |  |  |
    |  |  |
    |__|__|
       |
       |
       |
       #

  Finally, we apply the inverse model matrix transformation to the eye as well to bring it too into world space.
  Notice that the ray here matches the "voxels" through which the first ray also passes, as desired.
         ^
    ____/__
    |  /  |
    | /   |
    |/____|
    /
   /
  /
 #
  */
  transformed_eye = (inverse(vertex.resolution) * inverse(vertex.scale) * inverse(vertex.model) * (vec4(vertex.eye_pos, 1.))).xyz;

  // Step 3: Rays are from eye to vertices so that they get interpolated over the fragments.
  vray_dir = positions - transformed_eye;
}
`;

const moduleName$2 = "channelIntensity3D";
const fs$1 = `uniform ${moduleName$2}Uniforms {
  vec2 contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER};
} ${moduleName$2};

float apply_contrast_limits(float intensity, vec2 contrastLimits) {
  float contrastLimitsAppliedToIntensity = (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0]));
  return max(0., contrastLimitsAppliedToIntensity);
}
`;
const channelIntensity3D = {
  name: moduleName$2,
  uniformTypes: {
    [`contrastLimits${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec2<f32>"
  },
  fs: fs$1
};

const moduleName$1 = "fragmentUniforms3D";
const fs = `uniform ${moduleName$1}Uniforms {
  vec2 xSlice;
  vec2 ySlice;
  vec2 zSlice;
  mat4 scale;
  vec3 color${VIV_CHANNEL_INDEX_PLACEHOLDER};
  vec3 normal${VIV_PLANE_INDEX_PLACEHOLDER};
  float distance${VIV_PLANE_INDEX_PLACEHOLDER};
} ${moduleName$1};
`;
const fragmentUniforms3D = {
  name: moduleName$1,
  uniformTypes: {
    xSlice: "vec2<f32>",
    ySlice: "vec2<f32>",
    zSlice: "vec2<f32>",
    scale: "mat4x4<f32>",
    [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec3<f32>",
    [`normal${VIV_PLANE_INDEX_PLACEHOLDER}`]: "vec3<f32>",
    [`distance${VIV_PLANE_INDEX_PLACEHOLDER}`]: "f32"
  },
  fs
};

const moduleName = "vertex";
const vertexUniforms3D = {
  name: moduleName,
  uniformTypes: {
    eye_pos: "vec3<f32>",
    proj: "mat4x4<f32>",
    model: "mat4x4<f32>",
    view: "mat4x4<f32>",
    scale: "mat4x4<f32>",
    resolution: "mat4x4<f32>"
  }
};

const CUBE_STRIP = [
  1,
  1,
  0,
  0,
  1,
  0,
  1,
  1,
  1,
  0,
  1,
  1,
  0,
  0,
  1,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  1,
  0,
  1,
  0,
  0,
  1,
  1,
  1,
  1,
  0,
  1,
  0,
  0,
  1,
  1,
  0,
  0,
  0,
  0,
  0
];
const NUM_PLANES_DEFAULT = 1;
const defaultProps$1 = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: "object", value: {}, compare: true },
  contrastLimits: { type: "array", value: [], compare: true },
  colors: { type: "array", value: null, compare: true },
  dtype: { type: "string", value: "Uint8", compare: true },
  xSlice: { type: "array", value: null, compare: true },
  ySlice: { type: "array", value: null, compare: true },
  zSlice: { type: "array", value: null, compare: true },
  clippingPlanes: { type: "array", value: [], compare: true },
  resolutionMatrix: { type: "object", value: new Matrix4(), compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  extensions: {
    type: "array",
    value: [new ColorPalette3DExtensions.AdditiveBlendExtension()],
    compare: true
  }
};
function getRenderingAttrs() {
  const values = getDtypeValues("Float32");
  return {
    ...values,
    sampler: values.sampler.replace("2D", "3D"),
    cast: (data) => new Float32Array(data)
  };
}
function getRenderingFromExtensions(extensions) {
  let rendering = {};
  extensions.forEach((extension) => {
    if (extension.rendering._RENDER)
      rendering = extension.rendering;
  });
  if (!rendering._RENDER) {
    throw new Error(
      "XR3DLayer requires at least one extension to define opts.rendering as an object with _RENDER as a property at the minimum."
    );
  }
  return rendering;
}
const XR3DLayer = class extends Layer {
  /**
   * Returns the number of channels for this layer instance.
   * Implements VivLayer interface.
   */
  getNumChannels() {
    return this.props.selections?.length ?? this.props.channels?.length ?? MAX_CHANNELS;
  }
  /**
   * Returns the number of planes for this layer instance.
   * Implements VivLayer interface.
   */
  getNumPlanes() {
    const { clippingPlanes } = this.props;
    return clippingPlanes?.length || NUM_PLANES_DEFAULT;
  }
  initializeState() {
    const { device } = this.context;
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
  }
  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return extensions?.some((e) => {
      const shaders = e.getShaders.call(this, e);
      if (shaders) {
        const { inject = {}, modules = [] } = shaders;
        const definesInjection = inject[hookName];
        const moduleDefinesInjection = modules.some((m) => m?.inject?.[hookName]);
        return definesInjection || moduleDefinesInjection;
      }
      return false;
    });
  }
  /**
   * This function compiles the shaders and the projection module.
   */
  getShaders() {
    const { extensions } = this.props;
    const { sampler } = getRenderingAttrs();
    const { _BEFORE_RENDER, _RENDER, _AFTER_RENDER } = getRenderingFromExtensions(extensions);
    const extensionDefinesDeckglProcessIntensity = this._isHookDefinedByExtensions("fs:DECKGL_PROCESS_INTENSITY");
    const numChannels = this.getNumChannels();
    const numPlanes = this.getNumPlanes();
    const expandedChannelIntensity = expandShaderModule(
      channelIntensity3D,
      numChannels,
      numPlanes
    );
    const expandedFragmentUniforms = expandShaderModule(
      fragmentUniforms3D,
      numChannels,
      numPlanes
    );
    const expandedVertexUniforms = expandShaderModule(
      vertexUniforms3D,
      numChannels,
      numPlanes
    );
    const newChannelsModule = { inject: {}, ...expandedChannelIntensity };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject["fs:DECKGL_PROCESS_INTENSITY"] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return expandShaderModule(
      super.getShaders({
        vs,
        fs: fs$2.replace("_BEFORE_RENDER", _BEFORE_RENDER).replace("_RENDER", _RENDER).replace("_AFTER_RENDER", _AFTER_RENDER),
        defines: {
          SAMPLER_TYPE: sampler
        },
        modules: [
          newChannelsModule,
          expandedFragmentUniforms,
          expandedVertexUniforms
        ]
      }),
      numChannels,
      numPlanes
    );
  }
  /**
   * This function finalizes state by clearing all textures from the WebGL context
   */
  finalizeState() {
    super.finalizeState();
    if (this.state.textures) {
      Object.values(this.state.textures).forEach((tex) => tex?.delete());
    }
  }
  /**
   * This function updates state by retriggering model creation (shader compilation and attribute binding)
   * and loading any textures that need be loading.
   */
  updateState({ props, oldProps, changeFlags }) {
    const numChannels = this.getNumChannels();
    if (numChannels === 0) {
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: null });
      }
      return;
    }
    const channelCountChanged = (props.selections?.length ?? 0) !== (oldProps?.selections?.length ?? 0);
    if (changeFlags.extensionsChanged || props.colormap !== oldProps.colormap || props.renderingMode !== oldProps.renderingMode || props.clippingPlanes.length !== oldProps.clippingPlanes.length || channelCountChanged) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
    }
    if (props.channelData && props?.channelData?.data !== oldProps?.channelData?.data) {
      this.loadTexture(props.channelData);
    }
    if (this.state.textures && this.state.scaleMatrix) {
      this._updateUniforms(props);
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
        topology: "triangle-strip",
        attributes: {
          positions: new Float32Array(CUBE_STRIP)
        }
      }),
      shaderAssembler: VivShaderAssembler.getDefaultVivShaderAssembler()
    });
  }
  /**
   * This function builds and caches UBO uniform data that is independent of view state.
   */
  _updateUniforms(props) {
    const { textures, scaleMatrix } = this.state;
    if (!textures || !scaleMatrix)
      return;
    const numChannels = this.getNumChannels();
    const {
      contrastLimits,
      colors,
      xSlice,
      ySlice,
      zSlice,
      channelsVisible,
      domain,
      dtype,
      clippingPlanes,
      resolutionMatrix,
      selections
    } = props;
    const paddedContrastLimits = padContrastLimits({
      contrastLimits,
      channelsVisible,
      domain,
      dtype
    });
    const invertedScaleMatrix = scaleMatrix.clone().invert();
    const invertedResolutionMatrix = resolutionMatrix.clone().invert();
    const paddedClippingPlanes = padWithDefault(
      clippingPlanes.map(
        (p) => p.clone().transform(invertedScaleMatrix).transform(invertedResolutionMatrix)
      ),
      new Plane([1, 0, 0]),
      clippingPlanes.length || NUM_PLANES_DEFAULT
    );
    const normals = paddedClippingPlanes.flatMap((plane) => plane.normal);
    const distances = paddedClippingPlanes.map((plane) => plane.distance);
    const numPlanes = clippingPlanes.length || NUM_PLANES_DEFAULT;
    const numTextures = Object.values(textures).filter((t) => t).length;
    const numChannelsForColors = Math.max(
      numTextures,
      selections?.length || 0,
      1
    );
    const paddedColors = padColorsForUBO({
      channelsVisible: channelsVisible || Array(numChannelsForColors).fill(true),
      colors: colors || getDefaultPalette(numChannelsForColors)
    });
    const channelIntensity3DUniforms = {};
    for (let i = 0; i < numChannels; i++) {
      channelIntensity3DUniforms[`contrastLimits${i}`] = [
        paddedContrastLimits[i * 2],
        paddedContrastLimits[i * 2 + 1]
      ];
    }
    const fragmentUniforms3DUniforms = {
      xSlice: xSlice ? xSlice.map((i) => i / scaleMatrix[0] / resolutionMatrix[0]) : [0, 1],
      ySlice: ySlice ? ySlice.map((i) => i / scaleMatrix[5] / resolutionMatrix[5]) : [0, 1],
      zSlice: zSlice ? zSlice.map((i) => i / scaleMatrix[10] / resolutionMatrix[10]) : [0, 1],
      scale: scaleMatrix
    };
    for (let i = 0; i < numChannels; i++) {
      fragmentUniforms3DUniforms[`color${i}`] = paddedColors[i] || [0, 0, 0];
    }
    for (let i = 0; i < numPlanes; i++) {
      fragmentUniforms3DUniforms[`normal${i}`] = [
        normals[i * 3],
        normals[i * 3 + 1],
        normals[i * 3 + 2]
      ];
      fragmentUniforms3DUniforms[`distance${i}`] = distances[i];
    }
    this.setState({
      channelIntensity3DUniforms,
      fragmentUniforms3DUniforms
    });
  }
  /**
   * This function runs the shaders and draws to the canvas
   */
  draw() {
    const {
      model,
      scaleMatrix,
      channelIntensity3DUniforms,
      fragmentUniforms3DUniforms
    } = this.state;
    if (!channelIntensity3DUniforms || !fragmentUniforms3DUniforms) {
      if (this.state.textures && scaleMatrix) {
        this._updateUniforms(this.props);
      }
      return;
    }
    const texturesToBind = this._newTexturesFromLoadThisFrame ?? this.state.textures;
    const numChannels = this.getNumChannels();
    let bindings = null;
    if (texturesToBind && model && scaleMatrix) {
      const cacheKeyTextures = texturesToBind;
      const cacheKeyChannels = numChannels;
      if (this._cachedBindingsTextures !== cacheKeyTextures || this._cachedBindingsNumChannels !== cacheKeyChannels) {
        this._cachedBindings = normalizeTextureBindings(
          texturesToBind,
          numChannels,
          "volume"
        );
        this._cachedBindingsTextures = cacheKeyTextures;
        this._cachedBindingsNumChannels = cacheKeyChannels;
      }
      bindings = this._cachedBindings;
    }
    if (bindings && model && scaleMatrix) {
      const { modelMatrix, resolutionMatrix } = this.props;
      const { viewMatrix, viewMatrixInverse, projectionMatrix } = this.context.viewport;
      if (!this._vertexUniformsData) {
        this._vertexUniformsData = {
          eye_pos: [0, 0, 0],
          proj: null,
          model: null,
          view: null,
          scale: null,
          resolution: null
        };
      }
      const vertexUniformsData = this._vertexUniformsData;
      const eyePos = vertexUniformsData.eye_pos;
      eyePos[0] = viewMatrixInverse[12];
      eyePos[1] = viewMatrixInverse[13];
      eyePos[2] = viewMatrixInverse[14];
      vertexUniformsData.proj = projectionMatrix;
      if (!this._defaultModelMatrix) {
        this._defaultModelMatrix = new Matrix4();
      }
      vertexUniformsData.model = modelMatrix || this._defaultModelMatrix;
      vertexUniformsData.view = viewMatrix;
      vertexUniformsData.scale = scaleMatrix;
      vertexUniformsData.resolution = resolutionMatrix;
      model.shaderInputs.setProps({
        channelIntensity3D: channelIntensity3DUniforms,
        fragmentUniforms3D: fragmentUniforms3DUniforms,
        vertex: vertexUniformsData
      });
      model.setBindings(bindings);
      model.draw(this.context.renderPass);
      if (this._newTexturesFromLoadThisFrame) {
        this._newTexturesFromLoadThisFrame = null;
      }
    }
  }
  /**
   * This function loads all textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadTexture(channelData) {
    const numChannels = this.getNumChannels();
    const textures = {};
    for (let i = 0; i < numChannels; i++) {
      textures[`volume${i}`] = null;
    }
    if (this.state.textures) {
      Object.values(this.state.textures).forEach((tex) => tex?.delete());
    }
    if (channelData && Object.keys(channelData).length > 0 && channelData.data) {
      const { height, width, depth } = channelData;
      channelData.data.forEach((d, i) => {
        textures[`volume${i}`] = this.dataToTexture(d, width, height, depth);
      }, this);
      for (const key in textures) {
        if (!textures.volume0)
          throw new Error("Bad texture state!");
        if (!textures[key])
          textures[key] = textures.volume0;
      }
      this._newTexturesFromLoadThisFrame = textures;
      this.setState(
        {
          textures,
          scaleMatrix: new Matrix4().scale(
            this.props.physicalSizeScalingMatrix.transformPoint([
              width,
              height,
              depth
            ])
          )
        },
        () => {
          this._updateUniforms(this.props);
        }
      );
    } else {
      this._newTexturesFromLoadThisFrame = null;
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
      dimension: "3d",
      data: attrs.cast?.(data) ?? data,
      format: attrs.format,
      mipmaps: false,
      sampler: {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        addressModeW: "clamp-to-edge"
      }
    });
    return texture;
  }
};
XR3DLayer.layerName = "XR3DLayer";
XR3DLayer.defaultProps = defaultProps$1;

async function getVolume({
  source,
  selection,
  onUpdate = () => {
  },
  downsampleDepth = 1,
  signal
}) {
  const { shape, labels, dtype } = source;
  const { height, width } = getImageSize(source);
  const depth = shape[labels.indexOf("z")];
  const depthDownsampled = Math.max(1, Math.floor(depth / downsampleDepth));
  const rasterSize = height * width;
  const name = `${dtype}Array`;
  const TypedArray = globalThis[name];
  const volumeData = new TypedArray(rasterSize * depthDownsampled);
  await Promise.all(
    new Array(depthDownsampled).fill(0).map(async (_, z) => {
      const depthSelection = {
        ...selection,
        z: z * downsampleDepth
      };
      const { data: rasterData } = await source.getRaster({
        selection: depthSelection,
        signal
      });
      let r = 0;
      onUpdate();
      while (r < rasterSize) {
        const volIndex = z * rasterSize + (rasterSize - r - 1);
        const rasterIndex = (width - r - 1) % width + width * Math.floor(r / width);
        volumeData[volIndex] = rasterData[rasterIndex];
        r += 1;
      }
      onUpdate();
    })
  );
  return {
    data: volumeData,
    height,
    width,
    depth: depthDownsampled
  };
}
const getTextLayer = (text, viewport, id) => {
  return new TextLayer({
    id: `text-${id}`,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    data: [
      {
        text,
        position: viewport.position
      }
    ],
    getColor: [220, 220, 220, 255],
    getSize: 25,
    sizeUnits: "meters",
    sizeScale: 2 ** -viewport.zoom,
    fontFamily: "Helvetica"
  });
};

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: "array", value: [], compare: true },
  channelsVisible: { type: "array", value: [], compare: true },
  selections: { type: "array", value: [], compare: true },
  resolution: { type: "number", value: 0, compare: true },
  domain: { type: "array", value: [], compare: true },
  loader: {
    type: "object",
    value: [
      {
        getRaster: async () => ({ data: [], height: 0, width: 0 }),
        dtype: "Uint16",
        shape: [1],
        labels: ["z"]
      }
    ],
    compare: true
  },
  xSlice: { type: "array", value: null, compare: true },
  ySlice: { type: "array", value: null, compare: true },
  zSlice: { type: "array", value: null, compare: true },
  clippingPlanes: { type: "array", value: [], compare: true },
  onUpdate: { type: "function", value: () => {
  }, compare: true },
  useProgressIndicator: { type: "boolean", value: true, compare: true },
  extensions: {
    type: "array",
    value: [new ColorPalette3DExtensions.AdditiveBlendExtension()],
    compare: true
  }
};
const VolumeLayer = class extends CompositeLayer {
  clearState() {
    this.setState({
      height: null,
      width: null,
      depth: null,
      data: null,
      physicalSizeScalingMatrix: null,
      resolutionMatrix: null,
      progress: 0,
      abortController: null
    });
  }
  finalizeState() {
    this.state.abortController.abort();
  }
  updateState({ oldProps, props }) {
    const loaderChanged = props.loader !== oldProps.loader;
    const resolutionChanged = props.resolution !== oldProps.resolution;
    const selectionsChanged = props.selections !== oldProps.selections;
    if (resolutionChanged) {
      this.clearState();
    }
    if (loaderChanged || selectionsChanged || resolutionChanged) {
      const {
        loader,
        selections = [],
        resolution,
        onViewportLoad
      } = this.props;
      const source = loader[resolution];
      let progress = 0;
      const totalRequests = (source.shape[source.labels.indexOf("z")] >> resolution) * selections.length;
      const onUpdate = () => {
        progress += 0.5 / totalRequests;
        if (this.props.onUpdate) {
          this.props.onUpdate({ progress });
        }
        this.setState({ progress });
      };
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const volumePromises = selections.map(
        (selection) => getVolume({
          selection,
          source,
          onUpdate,
          downsampleDepth: 2 ** resolution,
          signal
        })
      );
      const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(
        loader[resolution]
      );
      Promise.all(volumePromises).then((volumes) => {
        if (onViewportLoad) {
          onViewportLoad(volumes);
        }
        const volume = {
          data: volumes.map((d) => d.data),
          width: volumes[0]?.width,
          height: volumes[0]?.height,
          depth: volumes[0]?.depth
        };
        this.setState({
          ...volume,
          physicalSizeScalingMatrix,
          resolutionMatrix: new Matrix4().scale(2 ** resolution)
        });
      });
    }
  }
  renderLayers() {
    const { loader, id, resolution, useProgressIndicator } = this.props;
    const { dtype } = loader[resolution];
    const {
      data,
      width,
      height,
      depth,
      progress,
      physicalSizeScalingMatrix,
      resolutionMatrix
    } = this.state;
    if (!(width && height) && useProgressIndicator) {
      const { viewport } = this.context;
      return getTextLayer(
        `Loading Volume ${String((progress || 0) * 100).slice(0, 5)}%...`,
        viewport,
        id
      );
    }
    return new XR3DLayer(this.props, {
      channelData: { data, width, height, depth },
      id: `XR3DLayer-${0}-${height}-${width}-${0}-${resolution}-${id}`,
      physicalSizeScalingMatrix,
      parameters: {
        [GL.CULL_FACE]: true,
        [GL.CULL_FACE_MODE]: GL.FRONT,
        [GL.DEPTH_TEST]: false,
        blendFunc: [GL.SRC_ALPHA, GL.ONE],
        blend: true
      },
      resolutionMatrix,
      dtype
    });
  }
};
VolumeLayer.layerName = "VolumeLayer";
VolumeLayer.defaultProps = defaultProps;

export { BitmapLayer, ImageLayer, MultiscaleImageLayer, OverviewLayer, ScaleBarLayer, VolumeLayer, XR3DLayer, XRLayer, getPhysicalSizeScalingMatrix, makeBoundingBox, padWithDefault };
