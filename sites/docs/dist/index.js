import { LayerExtension, COORDINATE_SYSTEM, CompositeLayer, Layer, project32, picking, OrthographicView, OrbitView, Controller } from '@deck.gl/core';
import { Matrix4 } from '@math.gl/core';
import { ShaderAssembler } from '@luma.gl/shadertools';
import { GL } from '@luma.gl/constants';
import { BaseDecoder, addDecoder, getDecoder, fromBlob, fromFile, fromUrl, GeoTIFFImage } from 'geotiff';
import { decompress } from 'lzw-tiff-decoder';
import quickselect from 'quickselect';
import * as z from 'zod';
import * as zarr from 'zarrita';
import { FetchStore } from 'zarrita';
import { BitmapLayer as BitmapLayer$1, PolygonLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import { Model, Geometry } from '@luma.gl/engine';
import { TileLayer } from '@deck.gl/geo-layers';
import { Plane } from '@math.gl/culling';
import DeckGL from '@deck.gl/react';
import equal from 'fast-deep-equal';
import * as React from 'react';

const MAX_COLOR_INTENSITY = 255;
const DEFAULT_COLOR_OFF = [0, 0, 0];
const MAX_CHANNELS = 10;
const VIV_CHANNEL_INDEX_PLACEHOLDER = "VIV_CHANNEL_INDEX";
const VIV_PLANE_INDEX_PLACEHOLDER = "VIV_PLANE_INDEX";
const DEFAULT_FONT_FAMILY = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const DTYPE_VALUES = {
  Uint8: {
    format: "r8uint",
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_BYTE,
    max: 2 ** 8 - 1,
    sampler: "usampler2D"
  },
  Uint16: {
    format: "r16uint",
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_SHORT,
    max: 2 ** 16 - 1,
    sampler: "usampler2D"
  },
  Uint32: {
    format: "r32uint",
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_INT,
    max: 2 ** 32 - 1,
    sampler: "usampler2D"
  },
  Float32: {
    format: "r32float",
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: "sampler2D"
  },
  Int8: {
    format: "r8sint",
    dataFormat: GL.RED_INTEGER,
    type: GL.BYTE,
    max: 2 ** (8 - 1) - 1,
    sampler: "isampler2D"
  },
  Int16: {
    format: "r16sint",
    dataFormat: GL.RED_INTEGER,
    type: GL.SHORT,
    max: 2 ** (16 - 1) - 1,
    sampler: "isampler2D"
  },
  Int32: {
    format: "r32sint",
    dataFormat: GL.RED_INTEGER,
    type: GL.INT,
    max: 2 ** (32 - 1) - 1,
    sampler: "isampler2D"
  },
  // Cast Float64 as 32 bit float point so it can be rendered.
  Float64: {
    format: "r32float",
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: "sampler2D",
    cast: (data) => new Float32Array(data)
  }
};
const COLORMAPS = [
  "jet",
  "hsv",
  "hot",
  "cool",
  "spring",
  "summer",
  "autumn",
  "winter",
  "bone",
  "copper",
  "greys",
  "yignbu",
  "greens",
  "yiorrd",
  "bluered",
  "rdbu",
  "picnic",
  "rainbow",
  "portland",
  "blackbody",
  "earth",
  "electric",
  "alpha",
  "viridis",
  "inferno",
  "magma",
  "plasma",
  "warm",
  "rainbow-soft",
  "bathymetry",
  "cdom",
  "chlorophyll",
  "density",
  "freesurface-blue",
  "freesurface-red",
  "oxygen",
  "par",
  "phase",
  "salinity",
  "temperature",
  "turbidity",
  "velocity-blue",
  "velocity-green",
  "cubehelix"
];
var RENDERING_MODES = /* @__PURE__ */ ((RENDERING_MODES2) => {
  RENDERING_MODES2["MAX_INTENSITY_PROJECTION"] = "Maximum Intensity Projection";
  RENDERING_MODES2["MIN_INTENSITY_PROJECTION"] = "Minimum Intensity Projection";
  RENDERING_MODES2["ADDITIVE"] = "Additive";
  return RENDERING_MODES2;
})(RENDERING_MODES || {});

function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const apply_transparent_color = `vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

var __defProp$5 = Object.defineProperty;
var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$5 = (obj, key, value) => {
  __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function expandLine(line, numChannels, numPlanes = 1) {
  if (line.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) {
    let str = "";
    for (let i = 0; i < numChannels; i++) {
      str += `${line.replaceAll(VIV_CHANNEL_INDEX_PLACEHOLDER, i.toString())}
`;
    }
    if (str.endsWith(",\n")) {
      str = `${str.slice(0, -2)}
`;
    }
    return str;
  }
  if (line.includes(VIV_PLANE_INDEX_PLACEHOLDER)) {
    let str = "";
    for (let i = 0; i < numPlanes; i++) {
      str += `${line.replaceAll(VIV_PLANE_INDEX_PLACEHOLDER, i.toString())}
`;
    }
    if (str.endsWith(",\n")) {
      str = `${str.slice(0, -2)}
`;
    }
    return str;
  }
  return line;
}
function processGLSLShader(shader, numChannels, numPlanes = 1) {
  return shader.split("\n").map((line) => expandLine(line, numChannels, numPlanes)).join("\n");
}
function expandShaderModule(module, numChannels, numPlanes = 1) {
  if (numChannels < 1) {
    throw new Error(
      `expandShaderModule requires numChannels >= 1, got ${numChannels}`
    );
  }
  if (numPlanes < 1) {
    throw new Error(
      `expandShaderModule requires numPlanes >= 1, got ${numPlanes}`
    );
  }
  const expandedModule = { ...module };
  if (module.uniformTypes) {
    const expandedUniformTypes = {};
    for (const [key, value] of Object.entries(module.uniformTypes)) {
      if (key.includes(VIV_CHANNEL_INDEX_PLACEHOLDER)) {
        for (let i = 0; i < numChannels; i++) {
          const expandedKey = key.replaceAll(
            VIV_CHANNEL_INDEX_PLACEHOLDER,
            i.toString()
          );
          expandedUniformTypes[expandedKey] = value;
        }
      } else if (key.includes(VIV_PLANE_INDEX_PLACEHOLDER)) {
        for (let i = 0; i < numPlanes; i++) {
          const expandedKey = key.replaceAll(
            VIV_PLANE_INDEX_PLACEHOLDER,
            i.toString()
          );
          expandedUniformTypes[expandedKey] = value;
        }
      } else {
        expandedUniformTypes[key] = value;
      }
    }
    expandedModule.uniformTypes = expandedUniformTypes;
  }
  if (module.fs) {
    expandedModule.fs = processGLSLShader(module.fs, numChannels, numPlanes);
  }
  if (module.vs) {
    expandedModule.vs = processGLSLShader(module.vs, numChannels, numPlanes);
  }
  const defines = { ...module.defines || {} };
  defines.NUM_CHANNELS = String(numChannels);
  defines.NUM_PLANES = String(numPlanes);
  expandedModule.defines = defines;
  return expandedModule;
}
const _VivShaderAssembler = class _VivShaderAssembler extends ShaderAssembler {
  constructor() {
    super();
    const defaultShaderAssembler = ShaderAssembler.getDefaultShaderAssembler();
    const defaultModules = defaultShaderAssembler._getModuleList();
    const defaultHookFunctions = defaultShaderAssembler._hookFunctions;
    for (const module of defaultModules) {
      this.addDefaultModule(module);
    }
    for (const hookFunction of defaultHookFunctions) {
      this.addShaderHook(hookFunction);
    }
    //!!! if we add this hook to the defaultShaderAssembler used by other deck layers,
    const mutateStr = "fs:DECKGL_MUTATE_COLOR(inout vec4 rgba, float[NUM_CHANNELS] intensity, vec2 vTexCoord)";
    const processStr = "fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)";
    this.addShaderHook(mutateStr);
    this.addShaderHook(processStr);
  }
  static getDefaultVivShaderAssembler() {
    if (!_VivShaderAssembler._default) {
      _VivShaderAssembler._default = new _VivShaderAssembler();
    }
    return _VivShaderAssembler._default;
  }
};
__publicField$5(_VivShaderAssembler, "_default");
let VivShaderAssembler = _VivShaderAssembler;
class VivLayerExtension extends LayerExtension {
  /**
   * deck.gl calls this as `extension.getShaders.call(layer, extension)`.
   * `this` is therefore the layer, and `extension` is the extension instance.
   */
  getShaders(extension) {
    const templates = extension.getVivShaderTemplates.call(this) || {};
    const numChannels = this.getNumChannels();
    const numPlanes = this.getNumPlanes();
    const modules = (templates.modules || []).map(
      (m) => expandShaderModule(m, numChannels, numPlanes)
    );
    return {
      modules
    };
  }
}
__publicField$5(VivLayerExtension, "extensionName", "VivLayerExtension");

const alpha = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,1,1,0);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const autumn = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,0,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const bathymetry = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.1568627450980392,0.10196078431372549,0.17254901960784313,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.23137254901960785,0.19215686274509805,0.35294117647058826,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.25098039215686274,0.2980392156862745,0.5450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.24705882352941178,0.43137254901960786,0.592156862745098,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.2823529411764706,0.5568627450980392,0.6196078431372549,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3333333333333333,0.6823529411764706,0.6392156862745098,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.47058823529411764,0.807843137254902,0.6392156862745098,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7333333333333333,0.9019607843137255,0.6745098039215687,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.996078431372549,0.8,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const blackbody = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.2;
  const vec4 v1 = vec4(0.9019607843137255,0,0,1);
  const float e2 = 0.4;
  const vec4 v2 = vec4(0.9019607843137255,0.8235294117647058,0,1);
  const float e3 = 0.7;
  const vec4 v3 = vec4(1,1,1,1);
  const float e4 = 1.0;
  const vec4 v4 = vec4(0.6274509803921569,0.7843137254901961,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),mix(v3,v4,a3)*step(e3,x)*step(x,e4)
  )));
}
`;
const bluered = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const bone = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.376;
  const vec4 v1 = vec4(0.32941176470588235,0.32941176470588235,0.4549019607843137,1);
  const float e2 = 0.753;
  const vec4 v2 = vec4(0.6627450980392157,0.7843137254901961,0.7843137254901961,1);
  const float e3 = 1.0;
  const vec4 v3 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),mix(v2,v3,a2)*step(e2,x)*step(x,e3)
  ));
}
`;
const cdom = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.1843137254901961,0.058823529411764705,0.24313725490196078,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.3411764705882353,0.09019607843137255,0.33725490196078434,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5098039215686274,0.10980392156862745,0.38823529411764707,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6705882352941176,0.1607843137254902,0.3764705882352941,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.807843137254902,0.2627450980392157,0.33725490196078434,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.9019607843137255,0.41568627450980394,0.32941176470588235,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9490196078431372,0.5843137254901961,0.403921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.7568627450980392,0.5294117647058824,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.996078431372549,0.9294117647058824,0.6901960784313725,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const chlorophyll = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.07058823529411765,0.1411764705882353,0.0784313725490196,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09803921568627451,0.24705882352941178,0.1607843137254902,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.09411764705882353,0.3568627450980392,0.23137254901960785,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.050980392156862744,0.4666666666666667,0.2823529411764706,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.07058823529411765,0.5803921568627451,0.3137254901960784,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3137254901960784,0.6784313725490196,0.34901960784313724,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5176470588235295,0.7686274509803922,0.47843137254901963,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6862745098039216,0.8666666666666667,0.6352941176470588,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.8431372549019608,0.9764705882352941,0.8156862745098039,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const cool = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.4549019607843137,0,0.8549019607843137,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3843137254901961,0.2901960784313726,0.9294117647058824,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.26666666666666666,0.5725490196078431,0.9058823529411765,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0,0.8,0.7725490196078432,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0,0.9686274509803922,0.5725490196078431,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0,1,0.34509803921568627,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.1568627450980392,1,0.03137254901960784,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5764705882352941,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const copper = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.804;
  const vec4 v1 = vec4(1,0.6274509803921569,0.4,1);
  const float e2 = 1.0;
  const vec4 v2 = vec4(1,0.7803921568627451,0.4980392156862745,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),mix(v1,v2,a1)*step(e1,x)*step(x,e2)
  );
}
`;
const cubehelix = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.07;
  const vec4 v1 = vec4(0.08627450980392157,0.0196078431372549,0.23137254901960785,1);
  const float e2 = 0.13;
  const vec4 v2 = vec4(0.23529411764705882,0.01568627450980392,0.4117647058823529,1);
  const float e3 = 0.2;
  const vec4 v3 = vec4(0.42745098039215684,0.00392156862745098,0.5294117647058824,1);
  const float e4 = 0.27;
  const vec4 v4 = vec4(0.6313725490196078,0,0.5764705882352941,1);
  const float e5 = 0.33;
  const vec4 v5 = vec4(0.8235294117647058,0.00784313725490196,0.5568627450980392,1);
  const float e6 = 0.4;
  const vec4 v6 = vec4(0.984313725490196,0.043137254901960784,0.4823529411764706,1);
  const float e7 = 0.47;
  const vec4 v7 = vec4(1,0.11372549019607843,0.3803921568627451,1);
  const float e8 = 0.53;
  const vec4 v8 = vec4(1,0.21176470588235294,0.27058823529411763,1);
  const float e9 = 0.6;
  const vec4 v9 = vec4(1,0.3333333333333333,0.1803921568627451,1);
  const float e10 = 0.67;
  const vec4 v10 = vec4(1,0.47058823529411764,0.13333333333333333,1);
  const float e11 = 0.73;
  const vec4 v11 = vec4(1,0.615686274509804,0.1450980392156863,1);
  const float e12 = 0.8;
  const vec4 v12 = vec4(0.9450980392156862,0.7490196078431373,0.2235294117647059,1);
  const float e13 = 0.87;
  const vec4 v13 = vec4(0.8784313725490196,0.8627450980392157,0.36470588235294116,1);
  const float e14 = 0.93;
  const vec4 v14 = vec4(0.8549019607843137,0.9450980392156862,0.5568627450980392,1);
  const float e15 = 1.0;
  const vec4 v15 = vec4(0.8901960784313725,0.9921568627450981,0.7764705882352941,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  float a10 = smoothstep(e10,e11,x);
  float a11 = smoothstep(e11,e12,x);
  float a12 = smoothstep(e12,e13,x);
  float a13 = smoothstep(e13,e14,x);
  float a14 = smoothstep(e14,e15,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),
    max(mix(v9,v10,a9)*step(e9,x)*step(x,e10),
    max(mix(v10,v11,a10)*step(e10,x)*step(x,e11),
    max(mix(v11,v12,a11)*step(e11,x)*step(x,e12),
    max(mix(v12,v13,a12)*step(e12,x)*step(x,e13),
    max(mix(v13,v14,a13)*step(e13,x)*step(x,e14),mix(v14,v15,a14)*step(e14,x)*step(x,e15)
  ))))))))))))));
}
`;
const density = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.21176470588235294,0.054901960784313725,0.1411764705882353,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.34901960784313724,0.09019607843137255,0.3137254901960784,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.43137254901960786,0.17647058823529413,0.5176470588235295,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.47058823529411764,0.30196078431372547,0.6980392156862745,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.47058823529411764,0.44313725490196076,0.8352941176470589,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.45098039215686275,0.592156862745098,0.8941176470588236,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5254901960784314,0.7254901960784313,0.8901960784313725,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6941176470588235,0.8392156862745098,0.8901960784313725,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9019607843137255,0.9450980392156862,0.9450980392156862,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const earth = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.5098039215686274,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0,0.7058823529411765,0.7058823529411765,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(0.1568627450980392,0.8235294117647058,0.1568627450980392,1);
  const float e3 = 0.4;
  const vec4 v3 = vec4(0.9019607843137255,0.9019607843137255,0.19607843137254902,1);
  const float e4 = 0.6;
  const vec4 v4 = vec4(0.47058823529411764,0.27450980392156865,0.0784313725490196,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const electric = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.15;
  const vec4 v1 = vec4(0.11764705882352941,0,0.39215686274509803,1);
  const float e2 = 0.4;
  const vec4 v2 = vec4(0.47058823529411764,0,0.39215686274509803,1);
  const float e3 = 0.6;
  const vec4 v3 = vec4(0.6274509803921569,0.35294117647058826,0,1);
  const float e4 = 0.8;
  const vec4 v4 = vec4(0.9019607843137255,0.7843137254901961,0,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(1,0.9803921568627451,0.8627450980392157,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const freesurface_blue = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.11764705882352941,0.01568627450980392,0.43137254901960786,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.1843137254901961,0.054901960784313725,0.6901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.1607843137254902,0.17647058823529413,0.9254901960784314,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.09803921568627451,0.38823529411764707,0.8313725490196079,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.26666666666666666,0.5137254901960784,0.7843137254901961,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.4470588235294118,0.611764705882353,0.7725490196078432,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.615686274509804,0.7098039215686275,0.796078431372549,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7843137254901961,0.8156862745098039,0.8470588235294118,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9450980392156862,0.9294117647058824,0.9254901960784314,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const freesurface_red = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.23529411764705882,0.03529411764705882,0.07058823529411765,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.39215686274509803,0.06666666666666667,0.10588235294117647,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5568627450980392,0.0784313725490196,0.11372549019607843,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6941176470588235,0.16862745098039217,0.10588235294117647,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7529411764705882,0.3411764705882353,0.24705882352941178,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.803921568627451,0.49019607843137253,0.4117647058823529,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8470588235294118,0.6352941176470588,0.5803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8901960784313725,0.7803921568627451,0.7568627450980392,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9450980392156862,0.9294117647058824,0.9254901960784314,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const greens = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0.26666666666666666,0.10588235294117647,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0.42745098039215684,0.17254901960784313,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.13725490196078433,0.5450980392156862,0.27058823529411763,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.2549019607843137,0.6705882352941176,0.36470588235294116,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.4549019607843137,0.7686274509803922,0.4627450980392157,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.6313725490196078,0.8509803921568627,0.6078431372549019,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.7803921568627451,0.9137254901960784,0.7529411764705882,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(0.8980392156862745,0.9607843137254902,0.8784313725490196,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9686274509803922,0.9882352941176471,0.9607843137254902,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const greys = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const hot = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.3;
  const vec4 v1 = vec4(0.9019607843137255,0,0,1);
  const float e2 = 0.6;
  const vec4 v2 = vec4(1,0.8235294117647058,0,1);
  const float e3 = 1.0;
  const vec4 v3 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),mix(v2,v3,a2)*step(e2,x)*step(x,e3)
  ));
}
`;
const hsv = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,0,1);
  const float e1 = 0.169;
  const vec4 v1 = vec4(0.9921568627450981,1,0.00784313725490196,1);
  const float e2 = 0.173;
  const vec4 v2 = vec4(0.9686274509803922,1,0.00784313725490196,1);
  const float e3 = 0.337;
  const vec4 v3 = vec4(0,0.9882352941176471,0.01568627450980392,1);
  const float e4 = 0.341;
  const vec4 v4 = vec4(0,0.9882352941176471,0.0392156862745098,1);
  const float e5 = 0.506;
  const vec4 v5 = vec4(0.00392156862745098,0.9764705882352941,1,1);
  const float e6 = 0.671;
  const vec4 v6 = vec4(0.00784313725490196,0,0.9921568627450981,1);
  const float e7 = 0.675;
  const vec4 v7 = vec4(0.03137254901960784,0,0.9921568627450981,1);
  const float e8 = 0.839;
  const vec4 v8 = vec4(1,0,0.984313725490196,1);
  const float e9 = 0.843;
  const vec4 v9 = vec4(1,0,0.9607843137254902,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(1,0,0.023529411764705882,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const inferno = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.01568627450980392,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.12156862745098039,0.047058823529411764,0.2823529411764706,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3333333333333333,0.058823529411764705,0.42745098039215684,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5333333333333333,0.13333333333333333,0.41568627450980394,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7294117647058823,0.21176470588235294,0.3333333333333333,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8901960784313725,0.34901960784313724,0.2,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9764705882352941,0.5490196078431373,0.0392156862745098,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.788235294117647,0.19607843137254902,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9882352941176471,1,0.6431372549019608,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const jet = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.5137254901960784,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0.23529411764705882,0.6666666666666666,1);
  const float e2 = 0.375;
  const vec4 v2 = vec4(0.0196078431372549,1,1,1);
  const float e3 = 0.625;
  const vec4 v3 = vec4(1,1,0,1);
  const float e4 = 0.875;
  const vec4 v4 = vec4(0.9803921568627451,0,0,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(0.5019607843137255,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const magma = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.01568627450980392,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.10980392156862745,0.06274509803921569,0.26666666666666666,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.30980392156862746,0.07058823529411765,0.4823529411764706,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5058823529411764,0.1450980392156863,0.5058823529411764,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7098039215686275,0.21176470588235294,0.47843137254901963,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8980392156862745,0.3137254901960784,0.39215686274509803,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.984313725490196,0.5294117647058824,0.3803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.996078431372549,0.7607843137254902,0.5294117647058824,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9882352941176471,0.9921568627450981,0.7490196078431373,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const oxygen = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.25098039215686274,0.0196078431372549,0.0196078431372549,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.41568627450980394,0.023529411764705882,0.058823529411764705,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5647058823529412,0.10196078431372549,0.027450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6588235294117647,0.25098039215686274,0.011764705882352941,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7372549019607844,0.39215686274509803,0.01568627450980392,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.807843137254902,0.5333333333333333,0.043137254901960784,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8627450980392157,0.6823529411764706,0.09803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9058823529411765,0.8431372549019608,0.17254901960784313,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9725490196078431,0.996078431372549,0.4117647058823529,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const par = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.2,0.0784313725490196,0.09411764705882353,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.35294117647058826,0.12549019607843137,0.13725490196078433,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5058823529411764,0.17254901960784313,0.13333333333333333,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6235294117647059,0.26666666666666666,0.09803921568627451,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7137254901960784,0.38823529411764707,0.07450980392156863,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.7803921568627451,0.5254901960784314,0.08627450980392157,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8313725490196079,0.6705882352941176,0.13725490196078433,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8666666666666667,0.8235294117647058,0.21176470588235294,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.8823529411764706,0.9921568627450981,0.29411764705882354,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const phase = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5686274509803921,0.4117647058823529,0.07058823529411765,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.7215686274509804,0.2784313725490196,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.7294117647058823,0.22745098039215686,0.45098039215686275,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6274509803921569,0.2784313725490196,0.7254901960784313,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.43137254901960786,0.3803921568627451,0.8549019607843137,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.19607843137254902,0.4823529411764706,0.6431372549019608,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.12156862745098039,0.5137254901960784,0.43137254901960786,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.30196078431372547,0.5058823529411764,0.13333333333333333,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5686274509803921,0.4117647058823529,0.07058823529411765,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const picnic = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0.2,0.6,1,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(0.4,0.8,1,1);
  const float e3 = 0.3;
  const vec4 v3 = vec4(0.6,0.8,1,1);
  const float e4 = 0.4;
  const vec4 v4 = vec4(0.8,0.8,1,1);
  const float e5 = 0.5;
  const vec4 v5 = vec4(1,1,1,1);
  const float e6 = 0.6;
  const vec4 v6 = vec4(1,0.8,1,1);
  const float e7 = 0.7;
  const vec4 v7 = vec4(1,0.6,1,1);
  const float e8 = 0.8;
  const vec4 v8 = vec4(1,0.4,0.8,1);
  const float e9 = 0.9;
  const vec4 v9 = vec4(1,0.4,0.4,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const plasma = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.050980392156862744,0.03137254901960784,0.5294117647058824,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.29411764705882354,0.011764705882352941,0.6313725490196078,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.49019607843137253,0.011764705882352941,0.6588235294117647,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6588235294117647,0.13333333333333333,0.5882352941176471,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.796078431372549,0.27450980392156865,0.4745098039215686,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8980392156862745,0.4196078431372549,0.36470588235294116,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9725490196078431,0.5803921568627451,0.2549019607843137,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9921568627450981,0.7647058823529411,0.1568627450980392,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9411764705882353,0.9764705882352941,0.12941176470588237,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const portland = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.047058823529411764,0.2,0.5137254901960784,1);
  const float e1 = 0.25;
  const vec4 v1 = vec4(0.0392156862745098,0.5333333333333333,0.7294117647058823,1);
  const float e2 = 0.5;
  const vec4 v2 = vec4(0.9490196078431372,0.8274509803921568,0.2196078431372549,1);
  const float e3 = 0.75;
  const vec4 v3 = vec4(0.9490196078431372,0.5607843137254902,0.2196078431372549,1);
  const float e4 = 1.0;
  const vec4 v4 = vec4(0.8509803921568627,0.11764705882352941,0.11764705882352941,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),mix(v3,v4,a3)*step(e3,x)*step(x,e4)
  )));
}
`;
const rainbow_soft = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0.7803921568627451,0,0.7058823529411765,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(1,0,0.4745098039215686,1);
  const float e3 = 0.3;
  const vec4 v3 = vec4(1,0.4235294117647059,0,1);
  const float e4 = 0.4;
  const vec4 v4 = vec4(0.8705882352941177,0.7607843137254902,0,1);
  const float e5 = 0.5;
  const vec4 v5 = vec4(0.5882352941176471,1,0,1);
  const float e6 = 0.6;
  const vec4 v6 = vec4(0,1,0.21568627450980393,1);
  const float e7 = 0.7;
  const vec4 v7 = vec4(0,0.9647058823529412,0.5882352941176471,1);
  const float e8 = 0.8;
  const vec4 v8 = vec4(0.19607843137254902,0.6549019607843137,0.8705882352941177,1);
  const float e9 = 0.9;
  const vec4 v9 = vec4(0.403921568627451,0.2,0.9215686274509803,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(0.48627450980392156,0,0.7294117647058823,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const rainbow = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5882352941176471,0,0.35294117647058826,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0,0.7843137254901961,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0,0.09803921568627451,1,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0,0.596078431372549,1,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.17254901960784313,1,0.5882352941176471,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.592156862745098,1,0,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(1,0.9176470588235294,0,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(1,0.43529411764705883,0,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const rdbu = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.0196078431372549,0.0392156862745098,0.6745098039215687,1);
  const float e1 = 0.35;
  const vec4 v1 = vec4(0.41568627450980394,0.5372549019607843,0.9686274509803922,1);
  const float e2 = 0.5;
  const vec4 v2 = vec4(0.7450980392156863,0.7450980392156863,0.7450980392156863,1);
  const float e3 = 0.6;
  const vec4 v3 = vec4(0.8627450980392157,0.6666666666666666,0.5176470588235295,1);
  const float e4 = 0.7;
  const vec4 v4 = vec4(0.9019607843137255,0.5686274509803921,0.35294117647058826,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(0.6980392156862745,0.0392156862745098,0.10980392156862745,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const salinity = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.16470588235294117,0.09411764705882353,0.4235294117647059,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.12941176470588237,0.19607843137254902,0.6352941176470588,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.058823529411764705,0.35294117647058826,0.5686274509803921,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.1568627450980392,0.4627450980392157,0.5372549019607843,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.23137254901960785,0.5725490196078431,0.5294117647058824,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.30980392156862746,0.6862745098039216,0.49411764705882355,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.47058823529411764,0.796078431372549,0.40784313725490196,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7568627450980392,0.8666666666666667,0.39215686274509803,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.9372549019607843,0.6039215686274509,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const spring = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const summer = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0.5019607843137255,0.4,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0.4,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const temperature = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.01568627450980392,0.13725490196078433,0.2,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09019607843137255,0.2,0.47843137254901963,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3333333333333333,0.23137254901960785,0.615686274509804,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5058823529411764,0.30980392156862746,0.5607843137254902,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.6862745098039216,0.37254901960784315,0.5098039215686274,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8705882352941177,0.4392156862745098,0.396078431372549,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9764705882352941,0.5725490196078431,0.25882352941176473,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.7686274509803922,0.2549019607843137,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9098039215686274,0.9803921568627451,0.3568627450980392,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const turbidity = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.13333333333333333,0.12156862745098039,0.10588235294117647,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.2549019607843137,0.19607843137254902,0.1607843137254902,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3843137254901961,0.27058823529411763,0.20392156862745098,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5137254901960784,0.34901960784313724,0.2235294117647059,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.6313725490196078,0.4392156862745098,0.23137254901960785,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.7254901960784313,0.5490196078431373,0.25882352941176473,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.792156862745098,0.6823529411764706,0.34509803921568627,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8470588235294118,0.8196078431372549,0.49411764705882355,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9137254901960784,0.9647058823529412,0.6705882352941176,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const velocity_blue = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.06666666666666667,0.12549019607843137,0.25098039215686274,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.13725490196078433,0.20392156862745098,0.4549019607843137,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.11372549019607843,0.3176470588235294,0.611764705882353,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.12156862745098039,0.44313725490196076,0.6352941176470588,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.19607843137254902,0.5647058823529412,0.6627450980392157,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3411764705882353,0.6784313725490196,0.6901960784313725,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5843137254901961,0.7686274509803922,0.7411764705882353,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.796078431372549,0.8666666666666667,0.8274509803921568,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.996078431372549,0.984313725490196,0.9019607843137255,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const velocity_green = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.09019607843137255,0.13725490196078433,0.07450980392156863,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09411764705882353,0.25098039215686274,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.043137254901960784,0.37254901960784315,0.17647058823529413,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.15294117647058825,0.4823529411764706,0.13725490196078433,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.37254901960784315,0.5725490196078431,0.047058823529411764,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.596078431372549,0.6470588235294118,0.07058823529411765,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.788235294117647,0.7294117647058823,0.27058823529411763,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9137254901960784,0.8470588235294118,0.5372549019607843,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,0.9921568627450981,0.803921568627451,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const viridis = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.26666666666666666,0.00392156862745098,0.32941176470588235,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.2784313725490196,0.17254901960784313,0.47843137254901963,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.23137254901960785,0.3176470588235294,0.5450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.17254901960784313,0.44313725490196076,0.5568627450980392,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.12941176470588237,0.5647058823529412,0.5529411764705883,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.15294117647058825,0.6784313725490196,0.5058823529411764,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.3607843137254902,0.7843137254901961,0.38823529411764707,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6666666666666666,0.8627450980392157,0.19607843137254902,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.9058823529411765,0.1450980392156863,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const warm = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.6745098039215687,0,0.7333333333333333,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.8588235294117647,0,0.6666666666666666,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(1,0,0.5098039215686274,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(1,0.24705882352941178,0.2901960784313726,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(1,0.4823529411764706,0,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9176470588235294,0.6901960784313725,0,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7450980392156863,0.8941176470588236,0,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5764705882352941,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const winter = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(0,1,0.5019607843137255,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const yignbu = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.03137254901960784,0.11372549019607843,0.34509803921568627,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0.1450980392156863,0.20392156862745098,0.5803921568627451,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.13333333333333333,0.3686274509803922,0.6588235294117647,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.11372549019607843,0.5686274509803921,0.7529411764705882,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.2549019607843137,0.7137254901960784,0.7686274509803922,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.4980392156862745,0.803921568627451,0.7333333333333333,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.7803921568627451,0.9137254901960784,0.7058823529411765,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(0.9294117647058824,0.9725490196078431,0.8509803921568627,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,1,0.8509803921568627,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const yiorrd = `vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5019607843137255,0,0.14901960784313725,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0.7411764705882353,0,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.8901960784313725,0.10196078431372549,0.10980392156862745,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.9882352941176471,0.3058823529411765,0.16470588235294117,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.9921568627450981,0.5529411764705883,0.23529411764705882,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.996078431372549,0.6980392156862745,0.2980392156862745,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.996078431372549,0.8509803921568627,0.4627450980392157,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(1,0.9294117647058824,0.6274509803921569,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,1,0.8,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;

const cmaps = {
  __proto__: null,
  alpha: alpha,
  autumn: autumn,
  bathymetry: bathymetry,
  blackbody: blackbody,
  bluered: bluered,
  bone: bone,
  cdom: cdom,
  chlorophyll: chlorophyll,
  cool: cool,
  copper: copper,
  cubehelix: cubehelix,
  density: density,
  earth: earth,
  electric: electric,
  freesurface_blue: freesurface_blue,
  freesurface_red: freesurface_red,
  greens: greens,
  greys: greys,
  hot: hot,
  hsv: hsv,
  inferno: inferno,
  jet: jet,
  magma: magma,
  oxygen: oxygen,
  par: par,
  phase: phase,
  picnic: picnic,
  plasma: plasma,
  portland: portland,
  rainbow: rainbow,
  rainbow_soft: rainbow_soft,
  rdbu: rdbu,
  salinity: salinity,
  spring: spring,
  summer: summer,
  temperature: temperature,
  turbidity: turbidity,
  velocity_blue: velocity_blue,
  velocity_green: velocity_green,
  viridis: viridis,
  warm: warm,
  winter: winter,
  yignbu: yignbu,
  yiorrd: yiorrd
};

function colormapModuleFactory(name, apply_cmap) {
  const extensionName = `additive_colormap_${name}`;
  return {
    name: extensionName,
    uniformTypes: {
      opacity: "f32",
      useTransparentColor: "u32"
    },
    fs: `uniform ${extensionName}Uniforms {
  float opacity;
  uint useTransparentColor; //no bool-like type in decode-shader-types.ts
} ${extensionName};
${apply_transparent_color}
${apply_cmap}
vec4 colormap(float intensity) {
  float opacity = ${extensionName}.opacity;
  bool useTransparentColor = ${extensionName}.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(apply_cmap(min(1.,intensity)).xyz, apply_cmap(0.).xyz, useTransparentColor, opacity));
}`,
    inject: {
      "fs:DECKGL_MUTATE_COLOR": `  float intensityCombo = 0.;
  for (int i = 0; i < NUM_CHANNELS; i++) {
    intensityCombo += max(0.,intensity[i]);
  }
  rgba = colormap(intensityCombo);`
    }
  };
}
const defaultProps$4$1 = {
  colormap: { type: "string", value: "viridis", compare: true },
  opacity: { type: "number", value: 1, compare: true },
  // we should review use of 'boolean', don't want to change it everywhere if not necessary.
  useTransparentColor: { type: "boolean", value: false, compare: true }
};
const AdditiveColormapExtension = class extends VivLayerExtension {
  // this doesn't need any shader code template manipulation, as long as NUM_CHANNELS is defined
  // we could just use `LayerExtension.getShaders()` as before here
  getVivShaderTemplates() {
    const name = _optionalChain$4([this, 'optionalAccess', _ => _.props, 'optionalAccess', _2 => _2.colormap]) || defaultProps$4$1.colormap.value;
    const apply_cmap = cmaps[name];
    if (!apply_cmap) {
      throw Error(`No colormap named ${name} found in registry`);
    }
    return { modules: [colormapModuleFactory(name, apply_cmap)] };
  }
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    const name = _optionalChain$4([this, 'optionalAccess', _3 => _3.props, 'optionalAccess', _4 => _4.colormap]) || defaultProps$4$1.colormap.value;
    const extensionName = `additive_colormap_${name}`;
    const models = this.getModels();
    for (const model of models) {
      model.shaderInputs.setProps({
        [extensionName]: {
          opacity: this.props.opacity,
          useTransparentColor: this.props.useTransparentColor
        }
      });
    }
  }
};
AdditiveColormapExtension.extensionName = "AdditiveColormapExtension";
AdditiveColormapExtension.defaultProps = defaultProps$4$1;

function padWithDefault$1(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}
const COLOR_PALETTE = [
  [0, 0, 255],
  // blue
  [0, 255, 0],
  // green
  [255, 0, 255],
  // magenta
  [255, 255, 0],
  // yellow
  [255, 128, 0],
  // orange
  [0, 255, 255],
  // cyan
  [255, 255, 255],
  // white
  [255, 0, 0]
  // red
];
function getDefaultPalette(n) {
  if (n > COLOR_PALETTE.length) {
    throw new Error("Too many colors");
  }
  return COLOR_PALETTE.slice(0, n);
}
function padColors({ colors, channelsVisible }) {
  const newColors = colors.map(
    (color, i) => channelsVisible[i] ? color.map((c) => c / MAX_COLOR_INTENSITY) : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault$1(
    newColors,
    /** @type {Color} */
    DEFAULT_COLOR_OFF,
    padSize
  ).reduce((acc, val) => acc.concat(val), []);
  return paddedColors;
}
function padColorsForUBO({ colors, channelsVisible }) {
  const newColors = colors.map(
    (color, i) => channelsVisible[i] ? color.map((c) => c / MAX_COLOR_INTENSITY) : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault$1(
    newColors,
    /** @type {Color} */
    DEFAULT_COLOR_OFF,
    padSize
  );
  return paddedColors;
}

const moduleName$1$1 = "colorPaletteModule";
const fs$1$1 = `uniform ${moduleName$1$1}Uniforms {
  vec3 transparentColor;
  uint useTransparentColor;
  float opacity;
  vec3 color${VIV_CHANNEL_INDEX_PLACEHOLDER};
} ${moduleName$1$1};

${apply_transparent_color}

void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName$1$1}.color${VIV_CHANNEL_INDEX_PLACEHOLDER},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += max(0.0, min(1.0, intensity[i])) * vec3(colors[i]);
  }
}
vec4 apply_opacity(vec3 rgb) {
  bool useTransparentColor = ${moduleName$1$1}.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(rgb, ${moduleName$1$1}.transparentColor, useTransparentColor, ${moduleName$1$1}.opacity));
}
`;
const DECKGL_MUTATE_COLOR = `vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity);
rgba = apply_opacity(rgb);
`;
const colorPalette = {
  name: moduleName$1$1,
  uniformTypes: {
    transparentColor: "vec3<f32>",
    useTransparentColor: "u32",
    opacity: "f32",
    [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec3<f32>"
  },
  fs: fs$1$1,
  inject: {
    "fs:DECKGL_MUTATE_COLOR": DECKGL_MUTATE_COLOR
  }
};

const defaultProps$3$1 = {
  colors: { type: "array", value: null, compare: true },
  opacity: { type: "number", value: 1, compare: true },
  transparentColor: { type: "array", value: null, compare: true },
  useTransparentColor: { type: "boolean", value: false, compare: true }
};
const ColorPaletteExtension = class extends VivLayerExtension {
  getVivShaderTemplates() {
    return {
      modules: [colorPalette]
    };
  }
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    const {
      colors,
      channelsVisible,
      opacity = defaultProps$3$1.opacity.value,
      transparentColor = defaultProps$3$1.transparentColor.value,
      useTransparentColor = defaultProps$3$1.useTransparentColor.value
    } = this.props;
    const selections = this.props.selections || this.selections || [];
    const numChannels = selections.length;
    const paddedColors = padColorsForUBO({
      channelsVisible: channelsVisible || selections.map(() => true),
      colors: colors || getDefaultPalette(numChannels)
    });
    const colorPaletteUniforms = {
      opacity,
      transparentColor: (transparentColor || [0, 0, 0]).map((i) => i / 255),
      useTransparentColor: useTransparentColor ? 1 : 0
    };
    for (let i = 0; i < numChannels; i++) {
      colorPaletteUniforms[`color${i}`] = paddedColors[i];
    }
    for (const model of this.getModels()) {
      model.shaderInputs.setProps({
        colorPaletteModule: colorPaletteUniforms
      });
    }
  }
};
ColorPaletteExtension.extensionName = "ColorPaletteExtension";
ColorPaletteExtension.defaultProps = defaultProps$3$1;

const moduleName$4 = "lensModule";
const fs$5 = `uniform ${moduleName$4}Uniforms {
  // lens bounds for ellipse
  float majorLensAxis;
  float minorLensAxis;

  // lens uniforms
  vec2 lensCenter;
  uint lensEnabled;
  int lensSelection;
  vec3 lensBorderColor;
  float lensBorderRadius;

  // color palette
  vec3 color${VIV_CHANNEL_INDEX_PLACEHOLDER};
} ${moduleName$4};

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Check membership in ellipse.
  return pow((${moduleName$4}.lensCenter.x - vTexCoord.x) / ${moduleName$4}.majorLensAxis, 2.) + pow((${moduleName$4}.lensCenter.y - vTexCoord.y) / ${moduleName$4}.minorLensAxis, 2.) < (1. - ${moduleName$4}.lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((${moduleName$4}.lensCenter.x - vTexCoord.x) / ${moduleName$4}.majorLensAxis, 2.) + pow((${moduleName$4}.lensCenter.y - vTexCoord.y) / ${moduleName$4}.minorLensAxis, 2.);

  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - ${moduleName$4}.lensBorderRadius);
}
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool lensEnabled = ${moduleName$4}.lensEnabled != uint(0);
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == ${moduleName$4}.lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity, vec2 vTexCoord) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName$4}.color${VIV_CHANNEL_INDEX_PLACEHOLDER},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    float useColorValue = get_use_color_float(vTexCoord, i);
    rgb += max(0., min(1., intensity[i])) * max(vec3(colors[i]), (1. - useColorValue) * vec3(1., 1., 1.));
  }
}
`;
const lens = {
  name: moduleName$4,
  uniformTypes: {
    majorLensAxis: "f32",
    minorLensAxis: "f32",
    lensCenter: "vec2<f32>",
    lensEnabled: "u32",
    lensSelection: "i32",
    lensBorderColor: "vec3<f32>",
    lensBorderRadius: "f32",
    [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec3<f32>"
  },
  fs: fs$5,
  inject: {
    "fs:DECKGL_MUTATE_COLOR": `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity, vTexCoord);
   rgba = vec4(rgb, 1.);
  `,
    "fs:#main-end": `
      bool lensEnabled = ${moduleName$4}.lensEnabled != uint(0);
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
      fragColor = (lensEnabled && isFragOnLensBounds) ? vec4(${moduleName$4}.lensBorderColor, 1.) : fragColor;
  `
  }
};

const defaultProps$2$1 = {
  lensEnabled: { type: "boolean", value: false, compare: true },
  lensSelection: { type: "number", value: 0, compare: true },
  lensRadius: { type: "number", value: 100, compare: true },
  lensBorderColor: { type: "array", value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: "number", value: 0.02, compare: true },
  colors: { type: "array", value: null, compare: true }
};
const LensExtension = class extends VivLayerExtension {
  getVivShaderTemplates() {
    return {
      modules: [lens]
    };
  }
  initializeState() {
    const layer = this.getCurrentLayer();
    if (layer.isComposite) {
      return;
    }
    const onMouseMove = () => {
      const { viewportId } = layer.props;
      const { lensRadius = defaultProps$2$1.lensRadius.value } = this.props;
      if (!viewportId) {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
        return;
      }
      const { mousePosition } = layer.context;
      const layerView = layer.context.deck.viewManager.views.filter(
        (view) => view.id === viewportId
      )[0];
      const viewState = layer.context.deck.viewManager.viewState[viewportId];
      const viewport = layerView.makeViewport({
        ...viewState,
        viewState
      });
      if (mousePosition && viewport.containsPixel(mousePosition)) {
        const offsetMousePosition = {
          x: mousePosition.x - viewport.x,
          y: mousePosition.y - viewport.y
        };
        const mousePositionBounds = [
          // left
          [offsetMousePosition.x - lensRadius, offsetMousePosition.y],
          // bottom
          [offsetMousePosition.x, offsetMousePosition.y + lensRadius],
          // right
          [offsetMousePosition.x + lensRadius, offsetMousePosition.y],
          // top
          [offsetMousePosition.x, offsetMousePosition.y - lensRadius]
        ];
        const unprojectLensBounds = mousePositionBounds.map(
          (bounds, i) => viewport.unproject(bounds)[i % 2]
        );
        layer.setState({ unprojectLensBounds });
      } else {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
      }
    };
    if (this.context.deck) {
      this.context.deck.eventManager.on({
        pointermove: onMouseMove,
        pointerleave: onMouseMove,
        wheel: onMouseMove
      });
    }
    this.setState({ onMouseMove, unprojectLensBounds: [0, 0, 0, 0] });
  }
  draw() {
    const { unprojectLensBounds = [0, 0, 0, 0] } = this.state;
    const {
      bounds,
      lensEnabled = defaultProps$2$1.lensEnabled.value,
      lensSelection = defaultProps$2$1.lensSelection.value,
      lensBorderColor = defaultProps$2$1.lensBorderColor.value,
      lensBorderRadius = defaultProps$2$1.lensBorderRadius.value,
      colors,
      channelsVisible
    } = this.props;
    const [leftMouseBound, bottomMouseBound, rightMouseBound, topMouseBound] = unprojectLensBounds;
    const [left, bottom, right, top] = bounds;
    const leftMouseBoundScaled = (leftMouseBound - left) / (right - left);
    const bottomMouseBoundScaled = (bottomMouseBound - top) / (bottom - top);
    const rightMouseBoundScaled = (rightMouseBound - left) / (right - left);
    const topMouseBoundScaled = (topMouseBound - top) / (bottom - top);
    const selections = this.props.selections || this.selections || [];
    const numChannels = this.getNumChannels();
    const paddedColors = padColorsForUBO({
      channelsVisible: channelsVisible || selections.map(() => true),
      colors: colors || getDefaultPalette(numChannels)
    });
    const lensModule = {
      majorLensAxis: (rightMouseBoundScaled - leftMouseBoundScaled) / 2,
      minorLensAxis: (bottomMouseBoundScaled - topMouseBoundScaled) / 2,
      lensCenter: [
        (rightMouseBoundScaled + leftMouseBoundScaled) / 2,
        (bottomMouseBoundScaled + topMouseBoundScaled) / 2
      ],
      lensEnabled: lensEnabled ? 1 : 0,
      lensSelection,
      lensBorderColor: lensBorderColor.map((i) => i / 255),
      lensBorderRadius
    };
    for (let i = 0; i < numChannels; i++) {
      lensModule[`color${i}`] = paddedColors[i];
    }
    _optionalChain$4([this, 'access', _5 => _5.state, 'access', _6 => _6.model, 'optionalAccess', _7 => _7.shaderInputs, 'access', _8 => _8.setProps, 'call', _9 => _9({
      lensModule
    })]);
  }
  finalizeState() {
    if (this.context.deck) {
      this.context.deck.eventManager.off({
        pointermove: _optionalChain$4([this, 'access', _10 => _10.state, 'optionalAccess', _11 => _11.onMouseMove]),
        pointerleave: _optionalChain$4([this, 'access', _12 => _12.state, 'optionalAccess', _13 => _13.onMouseMove]),
        wheel: _optionalChain$4([this, 'access', _14 => _14.state, 'optionalAccess', _15 => _15.onMouseMove])
      });
    }
  }
};
LensExtension.extensionName = "LensExtension";
LensExtension.defaultProps = defaultProps$2$1;

function colormapModuleFactory3D(name, apply_cmap) {
  const fs = `${apply_cmap}

vec4 colormap(float intensity, float opacity) {
  return vec4(apply_cmap(min(1.,intensity)).xyz, opacity);
}`;
  return {
    name: `additive-colormap-3d-${name}`,
    fs
  };
}
const defaultProps$1$1 = {
  colormap: { type: "string", value: "viridis", compare: true }
};
const BaseExtension$1 = class BaseExtension extends VivLayerExtension {
  constructor(...args) {
    super(args);
    this.opts = this.opts || {};
  }
  getVivShaderTemplates() {
    const name = _optionalChain$4([this, 'optionalAccess', _16 => _16.props, 'optionalAccess', _17 => _17.colormap]) || defaultProps$1$1.colormap.value;
    const apply_cmap = cmaps[name];
    return {
      modules: [colormapModuleFactory3D(name, apply_cmap)]
    };
  }
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.colormap !== oldProps.colormap) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: this._getModel(device) });
      }
    }
  }
};
BaseExtension$1.extensionName = "BaseExtension";
BaseExtension$1.defaultProps = defaultProps$1$1;

const _BEFORE_RENDER$5 = `// additive-colormap-3d before render
  float intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER} = 0.0;
`;
const _RENDER$5 = `// additive-colormap-3d render
  float total = 0.0;

  // this will create an unrolled accumulation over all channels
  total += intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER};
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);

  vec4 val_color = colormap(total, total);

  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  if (color.a >= 0.95) {
    break;
  }
  p += ray_dir * dt;
`;
const _AFTER_RENDER$5 = "";
const AdditiveBlendExtension$1 = class AdditiveBlendExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$5, _RENDER: _RENDER$5, _AFTER_RENDER: _AFTER_RENDER$5 };
  }
};
AdditiveBlendExtension$1.extensionName = "AdditiveBlendExtension";

const _BEFORE_RENDER$4 = `  float maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = -1.;
`;
const _RENDER$4 = `  maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = max(intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER}, maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER});
`;
const _AFTER_RENDER$4 = `  float total = 0.0;
  total += maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER};
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;
const MaximumIntensityProjectionExtension$1 = class MaximumIntensityProjectionExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$4, _RENDER: _RENDER$4, _AFTER_RENDER: _AFTER_RENDER$4 };
  }
};
MaximumIntensityProjectionExtension$1.extensionName = "MaximumIntensityProjectionExtension";

const _BEFORE_RENDER$3 = `  float minVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = 1. / 0.;
`;
const _RENDER$3 = `  minVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = min(intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER}, minVal${VIV_CHANNEL_INDEX_PLACEHOLDER});
`;
const _AFTER_RENDER$3 = `  float total = 0.0;
  total += minVal${VIV_CHANNEL_INDEX_PLACEHOLDER};
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;
const MinimumIntensityProjectionExtension$1 = class MinimumIntensityProjectionExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$3, _RENDER: _RENDER$3, _AFTER_RENDER: _AFTER_RENDER$3 };
  }
};
MinimumIntensityProjectionExtension$1.extensionName = "MinimumIntensityProjectionExtension";

const AdditiveColormap3DExtensions = {
  BaseExtension: BaseExtension$1,
  AdditiveBlendExtension: AdditiveBlendExtension$1,
  MaximumIntensityProjectionExtension: MaximumIntensityProjectionExtension$1,
  MinimumIntensityProjectionExtension: MinimumIntensityProjectionExtension$1
};

const defaultProps$9 = {
  colors: { type: "array", value: null, compare: true }
};
const BaseExtension = class extends VivLayerExtension {
  constructor(...args) {
    super(args);
    this.opts = this.opts || {};
  }
  getVivShaderTemplates() {
    return {};
  }
};
BaseExtension.extensionName = "BaseExtension";
BaseExtension.defaultProps = defaultProps$9;

const _BEFORE_RENDER$2 = `// additive-blend before render
  float intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER} = 0.0;`;
const _RENDER$2 = `// additive-blend render
  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);
  float total = 0.0;
  total += intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER};
  rgbCombo += max(0.0, min(1.0, intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER})) * fragmentUniforms3D.color${VIV_CHANNEL_INDEX_PLACEHOLDER};
  // Do not go past 1 in opacity.
  total = min(total, 1.0);
  vec4 val_color = vec4(rgbCombo, total);
  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  if (color.a >= 0.95) {
    break;
  }`;
const _AFTER_RENDER$2 = "";
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$2, _RENDER: _RENDER$2, _AFTER_RENDER: _AFTER_RENDER$2 };
  }
};
AdditiveBlendExtension.extensionName = "AdditiveBlendExtension";

const _BEFORE_RENDER$1 = `  float maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = -1.0;
`;
const _RENDER$1 = `  maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = max(intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER}, maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER});
`;
const _AFTER_RENDER$1 = `  vec3 rgbCombo = vec3(0.0);
  rgbCombo += max(0.0, min(1.0, maxVal${VIV_CHANNEL_INDEX_PLACEHOLDER})) * fragmentUniforms3D.color${VIV_CHANNEL_INDEX_PLACEHOLDER};
  color = vec4(rgbCombo, 1.0);
`;
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$1, _RENDER: _RENDER$1, _AFTER_RENDER: _AFTER_RENDER$1 };
  }
};
MaximumIntensityProjectionExtension.extensionName = "MaximumIntensityProjectionExtension";

const _BEFORE_RENDER = `  float minVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = 1.0 / 0.0;
`;
const _RENDER = `  minVal${VIV_CHANNEL_INDEX_PLACEHOLDER} = min(intensityValue${VIV_CHANNEL_INDEX_PLACEHOLDER}, minVal${VIV_CHANNEL_INDEX_PLACEHOLDER});
`;
const _AFTER_RENDER = `  vec3 rgbCombo = vec3(0.0);
  rgbCombo += max(0.0, min(1.0, minVal${VIV_CHANNEL_INDEX_PLACEHOLDER})) * fragmentUniforms3D.color${VIV_CHANNEL_INDEX_PLACEHOLDER};
  color = vec4(rgbCombo, 1.0);
`;
const MinimumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};
MinimumIntensityProjectionExtension.extensionName = "MinimumIntensityProjectionExtension";

const ColorPalette3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

var __defProp$4 = Object.defineProperty;
var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$4 = (obj, key, value) => {
  __defNormalProp$4(obj, key + "" , value);
  return value;
};
class LZWDecoder extends BaseDecoder {
  constructor(fileDirectory) {
    super();
    __publicField$4(this, "maxUncompressedSize");
    const width = fileDirectory.TileWidth || fileDirectory.ImageWidth;
    const height = fileDirectory.TileLength || fileDirectory.ImageLength;
    const nbytes = fileDirectory.BitsPerSample[0] / 8;
    this.maxUncompressedSize = width * height * nbytes;
  }
  async decodeBlock(buffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = await decompress(bytes, this.maxUncompressedSize);
    return decoded.buffer;
  }
}

function _nullishCoalesce$2(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const DTYPE_LOOKUP$1 = {
  uint8: "Uint8",
  uint16: "Uint16",
  uint32: "Uint32",
  float: "Float32",
  double: "Float64",
  int8: "Int8",
  int16: "Int16",
  int32: "Int32"
};
function getChannelStats(arr) {
  let len = arr.length;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let total = 0;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
    if (arr[len] > max) {
      max = arr[len];
    }
    total += arr[len];
  }
  const mean = total / arr.length;
  len = arr.length;
  let sumSquared = 0;
  while (len--) {
    sumSquared += (arr[len] - mean) ** 2;
  }
  const sd = (sumSquared / arr.length) ** 0.5;
  const mid = Math.floor(arr.length / 2);
  const firstQuartileLocation = Math.floor(arr.length / 4);
  const thirdQuartileLocation = 3 * Math.floor(arr.length / 4);
  quickselect(arr, mid);
  const median = arr[mid];
  quickselect(arr, firstQuartileLocation, 0, mid);
  const q1 = arr[firstQuartileLocation];
  quickselect(arr, thirdQuartileLocation, mid, arr.length - 1);
  const q3 = arr[thirdQuartileLocation];
  const cutoffArr = arr.filter((i) => i > 0);
  const cutoffPercentile = 5e-4;
  const topCutoffLocation = Math.floor(
    cutoffArr.length * (1 - cutoffPercentile)
  );
  const bottomCutoffLocation = Math.floor(cutoffArr.length * cutoffPercentile);
  quickselect(cutoffArr, topCutoffLocation);
  quickselect(cutoffArr, bottomCutoffLocation, 0, topCutoffLocation);
  const contrastLimits = [
    cutoffArr[bottomCutoffLocation] || 0,
    cutoffArr[topCutoffLocation] || 0
  ];
  return {
    mean,
    sd,
    q1,
    q3,
    median,
    domain: [min, max],
    contrastLimits
  };
}
function intToRgba(int) {
  if (!Number.isInteger(int)) {
    throw Error("Not an integer.");
  }
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, int, false);
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes);
}
function isInterleaved(shape) {
  const lastDimSize = shape[shape.length - 1];
  return lastDimSize === 3 || lastDimSize === 4;
}
function getLabels(dimOrder) {
  return dimOrder.toLowerCase().split("").reverse();
}
function getImageSize(source) {
  const interleaved = isInterleaved(source.shape);
  const [height, width] = source.shape.slice(interleaved ? -3 : -2);
  return { height, width };
}
function prevPowerOf2(x) {
  return 2 ** Math.floor(Math.log2(x));
}
const SIGNAL_ABORTED = "__vivSignalAborted";
function isElement(node) {
  return node.nodeType === 1;
}
function isText(node) {
  return node.nodeType === 3;
}
function xmlToJson(xmlNode, options) {
  if (isText(xmlNode)) {
    return _nullishCoalesce$2(_optionalChain$3([xmlNode, 'access', _2 => _2.nodeValue, 'optionalAccess', _3 => _3.trim, 'call', _4 => _4()]), () => ( ""));
  }
  if (xmlNode.childNodes.length === 0 && (!xmlNode.attributes || xmlNode.attributes.length === 0)) {
    return "";
  }
  const xmlObj = {};
  if (xmlNode.attributes && xmlNode.attributes.length > 0) {
    const attrsObj = {};
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attr = xmlNode.attributes[i];
      attrsObj[attr.name] = attr.value;
    }
    xmlObj[options.attrtibutesKey] = attrsObj;
  }
  for (let i = 0; i < xmlNode.childNodes.length; i++) {
    const childNode = xmlNode.childNodes[i];
    if (!isElement(childNode)) {
      continue;
    }
    const childXmlObj = xmlToJson(childNode, options);
    if (childXmlObj !== void 0 && childXmlObj !== "") {
      if (childNode.nodeName === "#text" && xmlNode.childNodes.length === 1) {
        return childXmlObj;
      }
      if (xmlObj[childNode.nodeName]) {
        if (!Array.isArray(xmlObj[childNode.nodeName])) {
          xmlObj[childNode.nodeName] = [xmlObj[childNode.nodeName]];
        }
        xmlObj[childNode.nodeName].push(childXmlObj);
      } else {
        xmlObj[childNode.nodeName] = childXmlObj;
      }
    }
  }
  return xmlObj;
}
function parseXML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Necessary for parsing XML
    xmlString.replace(/\u0000$/, ""),
    "application/xml"
  );
  return xmlToJson(doc.documentElement, { attrtibutesKey: "attr" });
}
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ""}`);
  }
}

const VIV_PROXY_KEY = "__viv";
const OFFSETS_PROXY_KEY = `${VIV_PROXY_KEY}-offsets`;
function createOffsetsProxy(tiff, offsets) {
  const get = (target, key) => {
    if (key === "getImage") {
      return (index) => {
        if (!(index in target.ifdRequests) && index in offsets) {
          const offset = offsets[index];
          target.ifdRequests[index] = target.parseFileDirectoryAt(offset);
        }
        return target.getImage(index);
      };
    }
    if (key === OFFSETS_PROXY_KEY) {
      return true;
    }
    return Reflect.get(target, key);
  };
  return new Proxy(tiff, { get });
}

const SCANNER_DEFAULTS = {
  initialWindowSize: 64 * 1024,
  maxWindowSize: 1024 * 1024,
  mode: "adaptive"
};
function validateScannerOptions(opts) {
  if (opts.initialWindowSize <= 0) {
    throw new Error(
      `initialWindowSize must be positive, got ${opts.initialWindowSize}`
    );
  }
  if (opts.maxWindowSize <= 0) {
    throw new Error(
      `maxWindowSize must be positive, got ${opts.maxWindowSize}`
    );
  }
  if (opts.initialWindowSize > opts.maxWindowSize) {
    throw new Error(
      `initialWindowSize (${opts.initialWindowSize}) must not exceed maxWindowSize (${opts.maxWindowSize})`
    );
  }
}
const LITTLE_ENDIAN = 18761;
const BIG_ENDIAN = 19789;
const CLASSIC_MAGIC = 42;
const BIGTIFF_MAGIC = 43;
function parseTiffHeader(buf) {
  const view = new DataView(buf);
  const bom = view.getUint16(0, false);
  let littleEndian;
  if (bom === LITTLE_ENDIAN) {
    littleEndian = true;
  } else if (bom === BIG_ENDIAN) {
    littleEndian = false;
  } else {
    throw new Error(`Invalid TIFF byte-order mark: 0x${bom.toString(16)}`);
  }
  const magic = view.getUint16(2, littleEndian);
  if (magic === CLASSIC_MAGIC) {
    const firstIfdOffset = view.getUint32(4, littleEndian);
    return { littleEndian, bigTiff: false, firstIfdOffset };
  }
  if (magic === BIGTIFF_MAGIC) {
    const firstIfdOffset = readUint64(view, 8, littleEndian);
    return { littleEndian, bigTiff: true, firstIfdOffset };
  }
  throw new Error(`Invalid TIFF magic number: ${magic}`);
}
function readUint64(view, offset, littleEndian) {
  const lo = view.getUint32(offset, littleEndian);
  const hi = view.getUint32(offset + 4, littleEndian);
  const value = littleEndian ? hi * 4294967296 + lo : lo * 4294967296 + hi;
  if (!Number.isSafeInteger(value)) {
    throw new Error(`IFD offset exceeds safe integer range: ${value}`);
  }
  return value;
}
function computeRequiredIfdSize(buf, localOffset, format) {
  const view = new DataView(buf);
  const { littleEndian, bigTiff } = format;
  if (bigTiff) {
    if (localOffset + 8 > buf.byteLength)
      return null;
    const entryCount2 = readUint64(view, localOffset, littleEndian);
    return 8 + entryCount2 * 20 + 8;
  }
  if (localOffset + 2 > buf.byteLength)
    return null;
  const entryCount = view.getUint16(localOffset, littleEndian);
  return 2 + entryCount * 12 + 4;
}
function parseIfd(buf, localOffset, format) {
  const view = new DataView(buf);
  const { littleEndian, bigTiff } = format;
  if (bigTiff) {
    if (localOffset + 8 > buf.byteLength)
      return null;
    const entryCount2 = readUint64(view, localOffset, littleEndian);
    const ifdSize2 = 8 + entryCount2 * 20 + 8;
    if (localOffset + ifdSize2 > buf.byteLength)
      return null;
    const nextIfdOffset2 = readUint64(
      view,
      localOffset + 8 + entryCount2 * 20,
      littleEndian
    );
    return { nextIfdOffset: nextIfdOffset2, bytesConsumed: ifdSize2 };
  }
  if (localOffset + 2 > buf.byteLength)
    return null;
  const entryCount = view.getUint16(localOffset, littleEndian);
  const ifdSize = 2 + entryCount * 12 + 4;
  if (localOffset + ifdSize > buf.byteLength)
    return null;
  const nextIfdOffset = view.getUint32(
    localOffset + 2 + entryCount * 12,
    littleEndian
  );
  return { nextIfdOffset, bytesConsumed: ifdSize };
}
function normalizeHeaders(headers) {
  if (!headers)
    return void 0;
  if (headers instanceof Headers) {
    const obj = {};
    headers.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  return headers;
}
async function fetchRange(url, start, end, headers) {
  const resp = await fetch(url, {
    headers: {
      ...normalizeHeaders(headers),
      Range: `bytes=${start}-${end - 1}`
    }
  });
  if (resp.status === 206) {
    return { buffer: await resp.arrayBuffer(), fullFile: false };
  }
  if (resp.ok) {
    return { buffer: await resp.arrayBuffer(), fullFile: true };
  }
  throw new Error(
    `HTTP ${resp.status} fetching range bytes=${start}-${end - 1}`
  );
}
async function fetchOffsetsJson(url, headers) {
  try {
    const offsetsUrl = `${url}.offsets.json`;
    console.log("[viv:offsets] Checking for offsets JSON at:", offsetsUrl);
    const resp = await fetch(offsetsUrl, {
      headers: normalizeHeaders(headers)
    });
    if (!resp.ok) {
      console.log(
        `[viv:offsets] offsets.json fetch returned HTTP ${resp.status}`
      );
      return null;
    }
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.log(
        "[viv:offsets] offsets.json response was not a valid array"
      );
      return null;
    }
    for (const n of data) {
      if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
        console.log(
          "[viv:offsets] offsets.json contains invalid entry:",
          n
        );
        return null;
      }
    }
    console.log(
      `[viv:offsets] offsets.json loaded successfully: ${data.length} offsets`
    );
    return data;
  } catch (err) {
    console.log("[viv:offsets] offsets.json fetch failed:", err);
    return null;
  }
}
async function scanIfdOffsets(url, headers, options) {
  const opts = { ...SCANNER_DEFAULTS, ...options };
  validateScannerOptions(opts);
  const initialWindow = opts.initialWindowSize;
  const headerResult = await fetchRange(url, 0, 16, headers);
  const format = parseTiffHeader(headerResult.buffer);
  const offsets = [];
  let currentOffset = format.firstIfdOffset;
  if (currentOffset === 0)
    return offsets;
  let bufStart;
  let buf;
  let haveFullFile;
  if (headerResult.fullFile) {
    buf = headerResult.buffer;
    bufStart = 0;
    haveFullFile = true;
  } else {
    buf = new ArrayBuffer(0);
    bufStart = -1;
    haveFullFile = false;
  }
  while (currentOffset !== 0) {
    offsets.push(currentOffset);
    const localOffset = currentOffset - bufStart;
    if (!haveFullFile && (bufStart < 0 || localOffset < 0 || localOffset >= buf.byteLength)) {
      const result = await fetchRange(
        url,
        currentOffset,
        currentOffset + initialWindow,
        headers
      );
      buf = result.buffer;
      bufStart = currentOffset;
      if (result.fullFile) {
        bufStart = 0;
        haveFullFile = true;
      }
    }
    const parsed = parseIfd(buf, currentOffset - bufStart, format);
    if (parsed !== null) {
      currentOffset = parsed.nextIfdOffset;
      continue;
    }
    const requiredSize = computeRequiredIfdSize(
      buf,
      currentOffset - bufStart,
      format
    );
    if (haveFullFile) {
      throw new Error(
        `IFD at offset ${currentOffset} extends beyond end of file`
      );
    }
    if (opts.mode === "fixed") {
      throw new Error(
        `IFD at offset ${currentOffset} requires ${_nullishCoalesce$2(requiredSize, () => ( "> entry-count header"))} bytes, exceeds fixed window of ${initialWindow} bytes`
      );
    }
    const neededBytes = _nullishCoalesce$2(requiredSize, () => ( initialWindow * 2));
    const retrySize = Math.min(
      Math.max(neededBytes, initialWindow * 2),
      opts.maxWindowSize
    );
    if (requiredSize !== null && retrySize < requiredSize) {
      throw new Error(
        `IFD at offset ${currentOffset} requires ${requiredSize} bytes, exceeds maxWindowSize of ${opts.maxWindowSize} bytes`
      );
    }
    const retryResult = await fetchRange(
      url,
      currentOffset,
      currentOffset + retrySize,
      headers
    );
    buf = retryResult.buffer;
    bufStart = currentOffset;
    if (retryResult.fullFile) {
      bufStart = 0;
      haveFullFile = true;
    }
    const retry = parseIfd(buf, currentOffset - bufStart, format);
    if (retry === null) {
      const exactSize = computeRequiredIfdSize(
        buf,
        currentOffset - bufStart,
        format
      );
      throw new Error(
        `IFD at offset ${currentOffset} could not be parsed after retry (required=${_nullishCoalesce$2(exactSize, () => ( "unknown"))} bytes, fetched=${retrySize}, max=${opts.maxWindowSize})`
      );
    }
    currentOffset = retry.nextIfdOffset;
  }
  return offsets;
}
async function resolveRemoteOffsets(url, headers, scannerOptions) {
  console.log("[viv:offsets] resolveRemoteOffsets called for:", url);
  const jsonOffsets = await fetchOffsetsJson(url, headers);
  if (jsonOffsets) {
    console.log(
      `[viv:offsets] Found .offsets.json with ${jsonOffsets.length} offsets for:`,
      url
    );
    return jsonOffsets;
  }
  console.log(
    "[viv:offsets] No .offsets.json found, scanning IFDs for:",
    url
  );
  const offsets = await scanIfdOffsets(url, headers, scannerOptions);
  console.log(
    `[viv:offsets] IFD scan complete: found ${offsets.length} offsets for:`,
    url
  );
  return offsets;
}

const PHOTOMETRIC_BLACK_IS_ZERO = 1;
const PHOTOMETRIC_RGB = 2;
const PHOTOMETRIC_YCBCR = 6;
function padSampleArray(values, length, fallback) {
  const src = values != null ? Array.from(values) : [];
  const fill = _nullishCoalesce$2(src[0], () => ( fallback));
  return Array.from({ length }, (_, i) => _nullishCoalesce$2(src[i], () => ( fill)));
}
function padTiffSampleTags(fileDirectory) {
  const spp = Math.max(
    1,
    _nullishCoalesce$2(_nullishCoalesce$2(fileDirectory.SamplesPerPixel, () => ( _optionalChain$3([fileDirectory, 'access', _5 => _5.BitsPerSample, 'optionalAccess', _6 => _6.length]))), () => ( 1))
  );
  const bits = fileDirectory.BitsPerSample;
  const formats = fileDirectory.SampleFormat;
  const bitsOk = bits != null && bits.length >= spp;
  const formatsOk = formats != null && formats.length >= spp;
  if (bitsOk && formatsOk)
    return;
  if (!bitsOk) {
    fileDirectory.BitsPerSample = padSampleArray(bits, spp, 8);
  }
  if (!formatsOk) {
    fileDirectory.SampleFormat = padSampleArray(formats, spp, 1);
  }
}
function isPackedRgbTiffImage(image) {
  const fd = image.fileDirectory;
  const spp = _nullishCoalesce$2(_nullishCoalesce$2(fd.SamplesPerPixel, () => ( _optionalChain$3([fd, 'access', _7 => _7.BitsPerSample, 'optionalAccess', _8 => _8.length]))), () => ( 1));
  const photo = fd.PhotometricInterpretation;
  return spp === 3 && (photo === PHOTOMETRIC_RGB || photo === PHOTOMETRIC_YCBCR);
}
function isPlanarRgbTiffImage(image) {
  const fd = image.fileDirectory;
  const spp = _nullishCoalesce$2(_nullishCoalesce$2(fd.SamplesPerPixel, () => ( _optionalChain$3([fd, 'access', _9 => _9.BitsPerSample, 'optionalAccess', _10 => _10.length]))), () => ( 1));
  return fd.PhotometricInterpretation === PHOTOMETRIC_RGB && fd.PlanarConfiguration === 2 && spp === 3;
}
function extractPhysicalSizesfromPixels(d) {
  if (!d["PhysicalSizeX"] || !d["PhysicalSizeY"] || !d["PhysicalSizeXUnit"] || !d["PhysicalSizeYUnit"]) {
    return void 0;
  }
  const physicalSizes = {
    x: { size: d["PhysicalSizeX"], unit: d["PhysicalSizeXUnit"] },
    y: { size: d["PhysicalSizeY"], unit: d["PhysicalSizeYUnit"] }
  };
  if (d["PhysicalSizeZ"] && d["PhysicalSizeZUnit"]) {
    physicalSizes.z = {
      size: d["PhysicalSizeZ"],
      unit: d["PhysicalSizeZUnit"]
    };
  }
  return physicalSizes;
}
function parsePixelDataType(dtype) {
  assert(dtype in DTYPE_LOOKUP$1, `Pixel type ${dtype} not supported.`);
  return DTYPE_LOOKUP$1[dtype];
}
function extractAxesFromPixels(d) {
  const labels = getLabels(d["DimensionOrder"]);
  const shape = Array(labels.length).fill(0);
  shape[labels.indexOf("t")] = d["SizeT"];
  shape[labels.indexOf("c")] = d["SizeC"];
  shape[labels.indexOf("z")] = d["SizeZ"];
  shape[labels.indexOf("y")] = d["SizeY"];
  shape[labels.indexOf("x")] = d["SizeX"];
  if (d["Interleaved"]) {
    labels.push("_c");
    shape.push(3);
  }
  return { labels, shape };
}
function getShapeForLevel(options) {
  const { axes, width, height } = options;
  const xIndex = axes.labels.indexOf("x");
  assert(xIndex !== -1, "x dimension not found");
  const yIndex = axes.labels.indexOf("y");
  assert(yIndex !== -1, "y dimension not found");
  const resolutionShape = axes.shape.slice();
  resolutionShape[xIndex] = width;
  resolutionShape[yIndex] = height;
  return resolutionShape;
}
function getTiffTileSize(image) {
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const size = Math.min(tileWidth, tileHeight);
  return prevPowerOf2(size);
}
function guessImageDataType(image) {
  const sampleIndex = 0;
  const format = _nullishCoalesce$2(_optionalChain$3([image, 'access', _11 => _11.fileDirectory, 'optionalAccess', _12 => _12.SampleFormat, 'optionalAccess', _13 => _13[sampleIndex]]), () => ( 1));
  const bitsPerSample = _nullishCoalesce$2(_optionalChain$3([image, 'access', _14 => _14.fileDirectory, 'access', _15 => _15.BitsPerSample, 'optionalAccess', _16 => _16[sampleIndex]]), () => ( 8));
  switch (format) {
    case 1:
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.uint8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.uint16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.uint32;
      }
      break;
    case 2:
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.int8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.int16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.int32;
      }
      break;
    case 3:
      switch (bitsPerSample) {
        case 16:
          return DTYPE_LOOKUP$1.float;
        case 32:
          return DTYPE_LOOKUP$1.float;
        case 64:
          return DTYPE_LOOKUP$1.double;
      }
      break;
  }
  throw Error("Unsupported data format/bitsPerSample");
}
function getMultiTiffShapeMap(tiffs) {
  let [c, z, t] = [0, 0, 0];
  for (const tiff of tiffs) {
    c = Math.max(c, tiff.selection.c);
    z = Math.max(z, tiff.selection.z);
    t = Math.max(t, tiff.selection.t);
  }
  const firstTiff = tiffs[0].tiff;
  return {
    x: firstTiff.getWidth(),
    y: firstTiff.getHeight(),
    z: z + 1,
    c: c + 1,
    t: t + 1
  };
}
function getChannelSamplesPerPixel(tiffs, numChannels) {
  const channelSamplesPerPixel = Array(numChannels).fill(0);
  for (const tiff of tiffs) {
    const curChannel = tiff.selection.c;
    const curSamplesPerPixel = tiff.tiff.getSamplesPerPixel();
    const existingSamplesPerPixel = channelSamplesPerPixel[curChannel];
    if (existingSamplesPerPixel && existingSamplesPerPixel !== curSamplesPerPixel) {
      throw Error("Channel samples per pixel mismatch");
    }
    channelSamplesPerPixel[curChannel] = curSamplesPerPixel;
  }
  return channelSamplesPerPixel;
}
function getMultiTiffMeta(dimensionOrder, tiffs) {
  const firstTiff = tiffs[0].tiff;
  const shapeMap = getMultiTiffShapeMap(tiffs);
  const shape = [];
  for (const dim of dimensionOrder.toLowerCase()) {
    shape.unshift(shapeMap[dim]);
  }
  const labels = getLabels(dimensionOrder);
  const dtype = guessImageDataType(firstTiff);
  return { shape, labels, dtype };
}
function getMultiTiffPixelMedatata(imageNumber, dimensionOrder, shapeMap, dType, tiffs, channelNames, channelSamplesPerPixel) {
  const channelMetadata = [];
  for (let i = 0; i < shapeMap.c; i += 1) {
    channelMetadata.push({
      ID: `Channel:${imageNumber}:${i}`,
      Name: channelNames[i],
      SamplesPerPixel: channelSamplesPerPixel[i]
    });
  }
  return {
    BigEndian: !tiffs[0].tiff.littleEndian,
    DimensionOrder: dimensionOrder,
    ID: `Pixels:${imageNumber}`,
    SizeC: shapeMap.c,
    SizeT: shapeMap.t,
    SizeX: shapeMap.x,
    SizeY: shapeMap.y,
    SizeZ: shapeMap.z,
    Type: dType,
    Channels: channelMetadata
  };
}
function getMultiTiffMetadata(imageName, tiffImages, channelNames, dimensionOrder, dType) {
  const imageNumber = 0;
  const id = `Image:${imageNumber}`;
  const date = "";
  const description = "";
  const shapeMap = getMultiTiffShapeMap(tiffImages);
  const channelSamplesPerPixel = getChannelSamplesPerPixel(
    tiffImages,
    shapeMap.c
  );
  if (channelNames.length !== shapeMap.c)
    throw Error(
      "Wrong number of channel names for number of channels provided"
    );
  const pixels = getMultiTiffPixelMedatata(
    imageNumber,
    dimensionOrder,
    shapeMap,
    dType,
    tiffImages,
    channelNames,
    channelSamplesPerPixel
  );
  const format = () => {
    return {
      "Acquisition Date": date,
      "Dimensions (XY)": `${shapeMap.x} x ${shapeMap.y}`,
      PixelsType: dType,
      "Z-sections/Timepoints": `${shapeMap.z} x ${shapeMap.t}`,
      Channels: shapeMap.c
    };
  };
  return {
    ID: id,
    Name: imageName,
    AcquisitionDate: date,
    Description: description,
    Pixels: pixels,
    format
  };
}
function parseFilename(path) {
  const parsedFilename = {};
  const filename = path.split("/").pop();
  const splitFilename = _optionalChain$3([filename, 'optionalAccess', _17 => _17.split, 'call', _18 => _18(".")]);
  if (splitFilename) {
    parsedFilename.name = splitFilename.slice(0, -1).join(".");
    [, parsedFilename.extension] = splitFilename;
  }
  return parsedFilename;
}
function createGeoTiffObject(source, { headers }) {
  if (source instanceof Blob) {
    return fromBlob(source);
  }
  const url = typeof source === "string" ? new URL(source) : source;
  if (url.protocol === "file:") {
    return fromFile(url.pathname);
  }
  return fromUrl(url.href, { headers, cacheSize: Number.POSITIVE_INFINITY });
}
async function createGeoTiff(source, options = {}) {
  const tiff = await _asyncNullishCoalesce(options.source, async () => ( await createGeoTiffObject(source, options)));
  if (options.offsets) {
    return createOffsetsProxy(tiff, options.offsets);
  }
  if (options.source) {
    return tiff;
  }
  if (!(source instanceof Blob)) {
    const url = typeof source === "string" ? new URL(source) : source;
    if (url.protocol !== "file:") {
      try {
        const offsets = await resolveRemoteOffsets(
          url.href,
          options.headers,
          options.scannerOptions
        );
        if (offsets.length > 0) {
          console.log(
            `[viv:offsets] Using resolved offsets (${offsets.length}) for:`,
            url.href
          );
          return createOffsetsProxy(tiff, offsets);
        }
        console.log(
          "[viv:offsets] No offsets resolved, falling back to default GeoTIFF traversal for:",
          url.href
        );
      } catch (err) {
        console.log(
          "[viv:offsets] Offset resolution failed, falling back to default GeoTIFF traversal:",
          err
        );
      }
    }
  }
  return tiff;
}

function createOmeImageIndexerFromResolver(resolveBaseResolutionImageLocation, image) {
  const ifdCache = [];
  return async (sel, pyramidLevel) => {
    const { tiff, ifdIndex } = await resolveBaseResolutionImageLocation(sel);
    const baseImage = await tiff.getImage(ifdIndex);
    padTiffSampleTags(baseImage.fileDirectory);
    if (pyramidLevel === 0) {
      return baseImage;
    }
    let index;
    if (baseImage.fileDirectory.SubIFDs) {
      index = baseImage.fileDirectory.SubIFDs[pyramidLevel - 1];
    } else {
      const resolutionOffset = pyramidLevel * image.size.z * image.size.t * image.size.c;
      index = ifdIndex + resolutionOffset;
    }
    if (!ifdCache[index]) {
      ifdCache[index] = await tiff.parseFileDirectoryAt(index);
    }
    const ifd = ifdCache[index];
    padTiffSampleTags(ifd.fileDirectory);
    return new GeoTIFFImage(
      ifd.fileDirectory,
      ifd.geoKeyDirectory,
      baseImage.dataView,
      tiff.littleEndian,
      tiff.cache,
      tiff.source
    );
  };
}
function getMultiTiffIndexer(tiffs) {
  function selectionToKey({ c = 0, t = 0, z = 0 }) {
    return `${c}-${t}-${z}`;
  }
  const lookup = new Map(
    tiffs.map(({ selection, tiff }) => [selectionToKey(selection), tiff])
  );
  return async (sel) => {
    const key = selectionToKey(sel);
    const img = lookup.get(key);
    if (!img)
      throw new Error(`No image available for selection ${key}`);
    return img;
  };
}

function needsPhotometricRgbConversion(photometricInterpretation) {
  return photometricInterpretation === PHOTOMETRIC_YCBCR;
}
function convertInterleavedPhotometricToRgb(data, photometricInterpretation) {
  if (photometricInterpretation === PHOTOMETRIC_YCBCR) {
    return interleavedYCbCrToRgb(data);
  }
  if (ArrayBuffer.isView(data) && data instanceof Uint8Array) {
    return data;
  }
  return Uint8Array.from(data);
}
function interleavedYCbCrToRgb(data) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const y = data[i];
    const cb = data[i + 1];
    const cr = data[i + 2];
    out[i] = clampRgb8(y + 1.402 * (cr - 128));
    out[i + 1] = clampRgb8(
      y - 0.34414 * (cb - 128) - 0.71414 * (cr - 128)
    );
    out[i + 2] = clampRgb8(y + 1.772 * (cb - 128));
  }
  return out;
}
function clampRgb8(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => {
  __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function sliceInterleavedSample(data, width, height, sample) {
  const n = width * height;
  const ArrayType = data.constructor;
  const out = new ArrayType(n);
  const s = sample | 0;
  for (let i = 0; i < n; i++) {
    out[i] = data[i * 3 + s];
  }
  return out;
}
function packedDecodeKey(selection, props) {
  const t = _nullishCoalesce$2(_optionalChain$3([selection, 'optionalAccess', _19 => _19.t]), () => ( 0));
  const z = _nullishCoalesce$2(_optionalChain$3([selection, 'optionalAccess', _20 => _20.z]), () => ( 0));
  const window = _optionalChain$3([props, 'optionalAccess', _21 => _21.window]);
  if (window)
    return `${t}:${z}:${window.join(",")}`;
  return `${t}:${z}:raster`;
}
const RGB_SAMPLES = [0, 1, 2];
class TiffPixelSource {
  constructor(indexer, dtype, tileSize, shape, labels, meta, pool) {
    this.dtype = dtype;
    this.tileSize = tileSize;
    this.shape = shape;
    this.labels = labels;
    this.meta = meta;
    this.pool = pool;
    __publicField$3(this, "_indexer");
    /** In-flight packed RGB decodes so c=0,1,2 share one JPEG decode. */
    // ponytail: dropped after this turn; LRU if sequential channel toggles re-decode.
    __publicField$3(this, "_packedDecodes", /* @__PURE__ */ new Map());
    this._indexer = indexer;
  }
  async getRaster({ selection, signal }) {
    const image = await this._indexer(selection);
    return this._readRasters(image, { signal }, selection);
  }
  async getTile({ x, y, selection, signal }) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];
    const image = await this._indexer(selection);
    return this._readRasters(
      image,
      { window, width, height, signal },
      selection
    );
  }
  async _readRasters(image, props, selection) {
    padTiffSampleTags(image.fileDirectory);
    const interleave = isInterleaved(this.shape);
    const signal = _optionalChain$3([props, 'optionalAccess', _22 => _22.signal]);
    if (_optionalChain$3([signal, 'optionalAccess', _23 => _23.aborted])) {
      throw SIGNAL_ABORTED;
    }
    const packedRgb = isPackedRgbTiffImage(image);
    const presentPlanar = packedRgb && !interleave;
    if (presentPlanar) {
      const key = packedDecodeKey(selection, props);
      let pending = this._packedDecodes.get(key);
      if (!pending) {
        pending = this._decodeVisualRgb(image, props, signal);
        this._packedDecodes.set(key, pending);
        pending.then(
          () => {
            queueMicrotask(() => this._packedDecodes.delete(key));
          },
          () => {
            this._packedDecodes.delete(key);
          }
        );
      }
      const rgb = await pending;
      const sample = Math.max(
        0,
        Math.min(2, Number(selection.c) || 0)
      );
      return {
        data: sliceInterleavedSample(rgb.data, rgb.width, rgb.height, sample),
        width: rgb.width,
        height: rgb.height
      };
    }
    return this._decodeVisualRgb(image, props, signal);
  }
  async _decodeVisualRgb(image, props, signal) {
    const interleave = isInterleaved(this.shape);
    const { signal: _signal, ...restProps } = _nullishCoalesce$2(props, () => ( {}));
    const packedRgb = isPackedRgbTiffImage(image);
    let raster;
    try {
      if (packedRgb) {
        raster = await image.readRasters({
          ...restProps,
          samples: RGB_SAMPLES,
          interleave: true,
          pool: this.pool
        });
      } else {
        raster = await image.readRasters({
          interleave,
          ...restProps,
          pool: this.pool
        });
      }
    } catch (err) {
      if (_optionalChain$3([signal, 'optionalAccess', _24 => _24.aborted])) {
        throw SIGNAL_ABORTED;
      }
      throw err;
    }
    if (_optionalChain$3([signal, 'optionalAccess', _25 => _25.aborted])) {
      throw SIGNAL_ABORTED;
    }
    const useInterleaved = packedRgb || interleave;
    let data = useInterleaved ? raster : raster[0];
    const photo = image.fileDirectory.PhotometricInterpretation;
    if (packedRgb && needsPhotometricRgbConversion(photo)) {
      data = convertInterleavedPhotometricToRgb(data, photo);
    }
    return {
      data,
      width: raster.width,
      height: raster.height
    };
  }
  /*
   * Computes tile size given x, y coord.
   */
  _getTileExtent(x, y) {
    const { height: zoomLevelHeight, width: zoomLevelWidth } = getImageSize(this);
    let height = this.tileSize;
    let width = this.tileSize;
    const maxXTileCoord = Math.floor(zoomLevelWidth / this.tileSize);
    const maxYTileCoord = Math.floor(zoomLevelHeight / this.tileSize);
    if (x === maxXTileCoord) {
      width = zoomLevelWidth % this.tileSize;
    }
    if (y === maxYTileCoord) {
      height = zoomLevelHeight % this.tileSize;
    }
    return { height, width };
  }
  onTileError(err) {
    console.error(err);
  }
}

function assertSameResolution(images) {
  const width = images[0].tiff.getWidth();
  const height = images[0].tiff.getHeight();
  for (const image of images) {
    if (image.tiff.getWidth() !== width || image.tiff.getHeight() !== height) {
      throw new Error("All images must have the same width and height");
    }
  }
}
async function assertCompleteStack(images, indexer) {
  for (let t = 0; t <= Math.max(...images.map((i) => i.selection.t)); t += 1) {
    for (let c = 0; c <= Math.max(...images.map((i) => i.selection.c)); c += 1) {
      for (let z = 0; z <= Math.max(...images.map((i) => i.selection.z)); z += 1) {
        await indexer({ t, c, z });
      }
    }
  }
}
async function load$2(imageName, images, channelNames, pool) {
  assertSameResolution(images);
  const firstImage = images[0].tiff;
  const sourcePhoto = firstImage.fileDirectory.PhotometricInterpretation;
  const dimensionOrder = "XYZCT";
  const tileSize = getTiffTileSize(firstImage);
  const visualRgb = isPackedRgbTiffImage(firstImage) || isPlanarRgbTiffImage(firstImage);
  const meta = {
    sourcePhotometricInterpretation: sourcePhoto,
    photometricInterpretation: visualRgb ? PHOTOMETRIC_RGB : sourcePhoto
  };
  const indexer = getMultiTiffIndexer(images);
  const { shape, labels, dtype } = getMultiTiffMeta(dimensionOrder, images);
  const metadata = getMultiTiffMetadata(
    imageName,
    images,
    channelNames,
    dimensionOrder,
    dtype
  );
  await assertCompleteStack(images, indexer);
  const source = new TiffPixelSource(
    indexer,
    dtype,
    tileSize,
    shape,
    labels,
    meta,
    pool
  );
  return {
    data: [source],
    metadata
  };
}

function flattenAttributes({
  attr,
  ...rest
}) {
  return { ...attr, ...rest };
}
function ensureArray(x) {
  return Array.isArray(x) ? x : [x];
}
const DimensionOrderSchema = z.enum([
  "XYZCT",
  "XYZTC",
  "XYCTZ",
  "XYCZT",
  "XYTCZ",
  "XYTZC"
]);
const PixelTypeSchema = z.enum([
  "int8",
  "int16",
  "int32",
  "uint8",
  "uint16",
  "uint32",
  "float",
  "bit",
  "double",
  "complex",
  "double-complex"
]);
const PhysicalUnitSchema = z.enum([
  "Ym",
  "Zm",
  "Em",
  "Pm",
  "Tm",
  "Gm",
  "Mm",
  "km",
  "hm",
  "dam",
  "m",
  "dm",
  "cm",
  "mm",
  "\xB5m",
  "nm",
  "pm",
  "fm",
  "am",
  "zm",
  "ym",
  "\xC5",
  "thou",
  "li",
  "in",
  "ft",
  "yd",
  "mi",
  "ua",
  "ly",
  "pc",
  "pt",
  "pixel",
  "reference frame"
]);
z.enum([
  "Rectangle",
  "Ellipse",
  "Polygon",
  "Polyline",
  "Line",
  "Point",
  "Label"
]);
const TransformSchema = z.object({}).extend({
  attr: z.object({
    A00: z.coerce.number(),
    A01: z.coerce.number(),
    A02: z.coerce.number(),
    A10: z.coerce.number(),
    A11: z.coerce.number(),
    A12: z.coerce.number()
  })
}).transform(flattenAttributes);
function createShapeSchema(specificAttrs, shapeType) {
  return z.object({
    Transform: TransformSchema.optional()
  }).extend({
    attr: z.object({
      // Common Shape attributes (inherited by all shapes)
      ID: z.string(),
      Label: z.string().optional(),
      // OME-XML uses "Label" 
      Name: z.string().optional(),
      // Some implementations also use "Name"
      // Visual styling attributes
      FillColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeColor: z.coerce.number().transform(intToRgba).optional(),
      StrokeWidth: z.coerce.number().optional(),
      StrokeDashArray: z.string().optional(),
      LineCap: z.enum(["Butt", "Round", "Square"]).optional(),
      // Spatial/temporal context attributes
      TheC: z.coerce.number().optional(),
      TheT: z.coerce.number().optional(),
      TheZ: z.coerce.number().optional(),
      // Text and font attributes
      Text: z.string().optional(),
      FontFamily: z.string().optional(),
      FontSize: z.coerce.number().optional(),
      FontStyle: z.enum(["Normal", "Italic", "Bold", "BoldItalic"]).optional(),
      // Interaction and state attributes
      Locked: z.string().transform((v) => v.toLowerCase() === "true").optional(),
      Visible: z.string().transform((v) => v.toLowerCase() === "true").optional(),
      // Shape-specific attributes
      ...specificAttrs
    })
  }).transform(flattenAttributes).transform((data) => ({ ...data, type: shapeType }));
}
const RectangleSchema = createShapeSchema({
  X: z.coerce.number(),
  // Top-left X coordinate
  Y: z.coerce.number(),
  // Top-left Y coordinate
  Width: z.coerce.number(),
  // Rectangle width
  Height: z.coerce.number()
  // Rectangle height
}, "rectangle");
const EllipseSchema = createShapeSchema({
  X: z.coerce.number(),
  // Center X coordinate
  Y: z.coerce.number(),
  // Center Y coordinate
  RadiusX: z.coerce.number(),
  // Horizontal radius
  RadiusY: z.coerce.number()
  // Vertical radius
}, "ellipse");
const LineSchema = createShapeSchema({
  X1: z.coerce.number(),
  // Start point X coordinate
  Y1: z.coerce.number(),
  // Start point Y coordinate
  X2: z.coerce.number(),
  // End point X coordinate
  Y2: z.coerce.number()
  // End point Y coordinate
}, "line");
const PointSchema = createShapeSchema({
  X: z.coerce.number(),
  // Point X coordinate
  Y: z.coerce.number()
  // Point Y coordinate
}, "point");
const PolygonSchema = createShapeSchema({
  Points: z.string()
  // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, "polygon");
const PolylineSchema = createShapeSchema({
  Points: z.string()
  // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, "polyline");
const LabelSchema = createShapeSchema({
  X: z.coerce.number(),
  // Label X coordinate
  Y: z.coerce.number()
  // Label Y coordinate
}, "label");
const UnionSchema = z.object({
  // Standard OME-XML element names
  Rectangle: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  Ellipse: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  Line: z.preprocess(ensureArray, LineSchema.array()).optional(),
  Point: z.preprocess(ensureArray, PointSchema.array()).optional(),
  Polygon: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  Polyline: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
  Label: z.preprocess(ensureArray, LabelSchema.array()).optional(),
  // Lowercase plural variants
  rectangles: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  ellipses: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  lines: z.preprocess(ensureArray, LineSchema.array()).optional(),
  points: z.preprocess(ensureArray, PointSchema.array()).optional(),
  polygons: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  polylines: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
  labels: z.preprocess(ensureArray, LabelSchema.array()).optional()
});
const ROISchema = z.object({
  Union: UnionSchema.optional()
}).extend({
  attr: z.object({
    ID: z.string(),
    Name: z.string().optional(),
    Description: z.string().optional()
  })
}).transform(flattenAttributes).transform((data) => {
  const shapes = [];
  if (data.Union) {
    if (data.Union.Rectangle)
      shapes.push(...data.Union.Rectangle);
    if (data.Union.Ellipse)
      shapes.push(...data.Union.Ellipse);
    if (data.Union.Line)
      shapes.push(...data.Union.Line);
    if (data.Union.Point)
      shapes.push(...data.Union.Point);
    if (data.Union.Polygon)
      shapes.push(...data.Union.Polygon);
    if (data.Union.Polyline)
      shapes.push(...data.Union.Polyline);
    if (data.Union.Label)
      shapes.push(...data.Union.Label);
    if (data.Union.rectangles)
      shapes.push(...data.Union.rectangles);
    if (data.Union.ellipses)
      shapes.push(...data.Union.ellipses);
    if (data.Union.lines)
      shapes.push(...data.Union.lines);
    if (data.Union.points)
      shapes.push(...data.Union.points);
    if (data.Union.polygons)
      shapes.push(...data.Union.polygons);
    if (data.Union.polylines)
      shapes.push(...data.Union.polylines);
    if (data.Union.labels)
      shapes.push(...data.Union.labels);
  }
  const { Union, ...rest } = data;
  return { ...rest, shapes };
});
const ROIRefSchema = z.object({}).extend({
  attr: z.object({
    ID: z.string()
  })
}).transform(flattenAttributes);
const ChannelSchema = z.object({}).extend({
  attr: z.object({
    ID: z.string(),
    SamplesPerPixel: z.coerce.number().optional(),
    Name: z.string().optional(),
    Color: z.coerce.number().transform(intToRgba).optional()
  })
}).transform(flattenAttributes);
const UuidSchema = z.object({}).extend({
  attr: z.object({
    FileName: z.string()
  })
}).transform(flattenAttributes);
const TiffDataSchema = z.object({ UUID: UuidSchema.optional() }).extend({
  attr: z.object({
    IFD: z.coerce.number().default(0),
    PlaneCount: z.coerce.number().default(1),
    FirstT: z.coerce.number().optional(),
    FirstC: z.coerce.number().optional(),
    FirstZ: z.coerce.number().optional()
  })
}).transform(flattenAttributes);
const PixelsSchema = z.object({
  Channel: z.preprocess(ensureArray, ChannelSchema.array()),
  TiffData: z.preprocess(ensureArray, TiffDataSchema.array()).optional()
}).extend({
  attr: z.object({
    ID: z.string(),
    DimensionOrder: DimensionOrderSchema,
    Type: PixelTypeSchema,
    SizeT: z.coerce.number(),
    SizeC: z.coerce.number(),
    SizeZ: z.coerce.number(),
    SizeY: z.coerce.number(),
    SizeX: z.coerce.number(),
    PhysicalSizeX: z.coerce.number().optional(),
    PhysicalSizeY: z.coerce.number().optional(),
    PhysicalSizeZ: z.coerce.number().optional(),
    SignificantBits: z.coerce.number().optional(),
    PhysicalSizeXUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    PhysicalSizeYUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    PhysicalSizeZUnit: PhysicalUnitSchema.optional().default("\xB5m"),
    BigEndian: z.string().transform((v) => v.toLowerCase() === "true").optional(),
    Interleaved: z.string().transform((v) => v.toLowerCase() === "true").optional()
  })
}).transform(flattenAttributes).transform(({ Channel, ...rest }) => ({ Channels: Channel, ...rest }));
const ImageSchema = z.object({
  AquisitionDate: z.string().optional().default(""),
  Description: z.unknown().optional().default(""),
  Pixels: PixelsSchema,
  ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
}).extend({
  attr: z.object({
    ID: z.string(),
    Name: z.string().optional()
  })
}).transform(flattenAttributes);
const OmeSchema = z.object({
  Image: z.preprocess(ensureArray, ImageSchema.array()).optional(),
  ROI: z.preprocess(ensureArray, ROISchema.array()).optional(),
  ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
}).transform((raw) => {
  const images = _nullishCoalesce$2(raw.Image, () => ( []));
  const rootRefs = _nullishCoalesce$2(raw.ROIRef, () => ( []));
  const imageRefs = images.flatMap((img) => _nullishCoalesce$2(img.ROIRef, () => ( [])));
  const ROIRefCombined = [...rootRefs, ...imageRefs];
  return { ...raw, ROIRefCombined };
});
function fromString(str) {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  return {
    images: _nullishCoalesce$2(omeXml.Image, () => ( [])),
    rois: _nullishCoalesce$2(omeXml.ROI, () => ( [])),
    roiRefs: _nullishCoalesce$2(omeXml.ROIRefCombined, () => ( []))
  };
}

function isCompleteTiffDataItem(item) {
  return "FirstC" in item && "FirstT" in item && "FirstZ" in item && "IFD" in item && "UUID" in item;
}
function createMultifileImageDataLookup(tiffData) {
  const lookup = /* @__PURE__ */ new Map();
  function keyFor({ t, c, z }) {
    return `t${t}.c${c}.z${z}`;
  }
  assert(tiffData, "No TiffData in OME-XML");
  for (const imageData of tiffData) {
    assert(isCompleteTiffDataItem(imageData), "Incomplete TiffData item");
    const key = keyFor({
      t: imageData["FirstT"],
      c: imageData["FirstC"],
      z: imageData["FirstZ"]
    });
    const imageDataPointer = {
      ifd: imageData["IFD"],
      filename: imageData["UUID"]["FileName"]
    };
    lookup.set(key, imageDataPointer);
  }
  return {
    getImageDataPointer(selection) {
      const entry = lookup.get(keyFor(selection));
      assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
      return entry;
    }
  };
}
function createMultifileOmeTiffResolver(options) {
  const tiffs = /* @__PURE__ */ new Map();
  const lookup = createMultifileImageDataLookup(options.tiffData);
  return async (selection) => {
    const entry = lookup.getImageDataPointer(selection);
    if (!tiffs.has(entry.filename)) {
      const url = new URL(entry.filename, options.baseUrl);
      const tiff2 = await createGeoTiff(url, options);
      tiffs.set(entry.filename, tiff2);
    }
    const tiff = tiffs.get(entry.filename);
    assert(tiff, `No GeoTIFF for ${entry.filename}`);
    return { tiff, ifdIndex: entry.ifd };
  };
}
async function getPixelSourceOptionsForImage(metadata, config) {
  const resolveOmeSelection = createMultifileOmeTiffResolver({
    tiffData: metadata["Pixels"]["TiffData"],
    baseUrl: config.baseUrl,
    headers: config.headers
  });
  const { tiff, ifdIndex } = await resolveOmeSelection({ c: 0, t: 0, z: 0 });
  const baseImage = await tiff.getImage(ifdIndex);
  const pyramidIndexer = createOmeImageIndexerFromResolver(
    resolveOmeSelection,
    {
      size: {
        z: metadata["Pixels"]["SizeZ"],
        t: metadata["Pixels"]["SizeT"],
        c: metadata["Pixels"]["SizeC"]
      }
    }
  );
  return {
    pyramidIndexer,
    levels: baseImage.fileDirectory.SubIFDs ? baseImage.fileDirectory.SubIFDs.length + 1 : 1,
    tileSize: getTiffTileSize(baseImage),
    axes: extractAxesFromPixels(metadata["Pixels"]),
    dtype: parsePixelDataType(metadata["Pixels"]["Type"]),
    meta: {
      physicalSizes: extractPhysicalSizesfromPixels(metadata["Pixels"]),
      sourcePhotometricInterpretation: baseImage.fileDirectory.PhotometricInterpretation,
      photometricInterpretation: isPackedRgbTiffImage(baseImage) || isPlanarRgbTiffImage(baseImage) ? PHOTOMETRIC_RGB : baseImage.fileDirectory.PhotometricInterpretation
    }
  };
}
async function loadMultifileOmeTiff(source, options = {}) {
  assert(
    !(source instanceof File),
    "File or Blob not supported for multifile OME-TIFF"
  );
  const url = new URL(source);
  const text = await fetch(url).then((res) => res.text());
  const parsed = fromString(text);
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  const images = (parsed.images || []).map((image) => {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });
  const tiffImages = [];
  for (const metadata of images) {
    const opts = await getPixelSourceOptionsForImage(metadata, {
      baseUrl: url,
      headers: options.headers || {}
    });
    const data = await Promise.all(
      Array.from({ length: opts.levels }, async (_, level) => {
        const levelImage = await opts.pyramidIndexer(
          { t: 0, c: 0, z: 0 },
          level
        );
        return new TiffPixelSource(
          (sel) => opts.pyramidIndexer(
            { t: _nullishCoalesce$2(sel.t, () => ( 0)), c: _nullishCoalesce$2(sel.c, () => ( 0)), z: _nullishCoalesce$2(sel.z, () => ( 0)) },
            level
          ),
          opts.dtype,
          opts.tileSize,
          getShapeForLevel({
            axes: opts.axes,
            width: levelImage.getWidth(),
            height: levelImage.getHeight()
          }),
          opts.axes.labels,
          opts.meta,
          options.pool
        );
      })
    );
    tiffImages.push({ data, metadata });
  }
  return tiffImages;
}

function rootMetaForAvailableIfds(images, imageCount, packedRgb) {
  if (images.length <= 1)
    return images;
  const out = [];
  let used = 0;
  for (const image of images) {
    const p = image.Pixels;
    const c = packedRgb ? 1 : Math.max(1, _nullishCoalesce$2(_optionalChain$3([p, 'optionalAccess', _26 => _26.SizeC]), () => ( 1)));
    const n = Math.max(1, _nullishCoalesce$2(_optionalChain$3([p, 'optionalAccess', _27 => _27.SizeZ]), () => ( 1))) * c * Math.max(1, _nullishCoalesce$2(_optionalChain$3([p, 'optionalAccess', _28 => _28.SizeT]), () => ( 1)));
    if (out.length > 0 && used + n > imageCount)
      break;
    out.push(image);
    used += n;
  }
  return out;
}
function resolveMetadata(omexml, SubIFDs) {
  const rois = omexml.rois || [];
  const roiRefs = omexml.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  const images = (omexml.images || []).map((image) => {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });
  if (SubIFDs) {
    return { levels: SubIFDs.length + 1, rootMeta: images };
  }
  const firstImageMetadata = images[0];
  return { levels: images.length, rootMeta: [firstImageMetadata] };
}
function getRelativeOmeIfdIndex({ z, t, c }, image) {
  const { size, dimensionOrder } = image;
  switch (image.dimensionOrder) {
    case "XYZCT":
      return z + size.z * c + size.z * size.c * t;
    case "XYZTC":
      return z + size.z * t + size.z * size.t * c;
    case "XYCTZ":
      return c + size.c * t + size.c * size.t * z;
    case "XYCZT":
      return c + size.c * z + size.c * size.z * t;
    case "XYTCZ":
      return t + size.t * c + size.t * size.c * z;
    case "XYTZC":
      return t + size.t * z + size.t * size.z * c;
    default:
      throw new Error(`Invalid dimension order: ${dimensionOrder}`);
  }
}
function createSingleFileOmeTiffPyramidalIndexer(tiff, image) {
  return createOmeImageIndexerFromResolver((sel) => {
    const withinImageIndex = getRelativeOmeIfdIndex(sel, image);
    const ifdIndex = withinImageIndex + image.ifdOffset;
    return { tiff, ifdIndex };
  }, image);
}
function collapsePackedRgbPixelsMetadata(metadata, vivDtype) {
  const pixels = metadata.Pixels;
  const firstChannel = _nullishCoalesce$2(_optionalChain$3([pixels, 'access', _29 => _29.Channels, 'optionalAccess', _30 => _30[0]]), () => ( {}));
  return {
    ...metadata,
    Pixels: {
      ...pixels,
      SizeC: 1,
      Interleaved: true,
      Type: vivDtype,
      Channels: [
        {
          ...firstChannel,
          SamplesPerPixel: 3
        }
      ]
    }
  };
}
const PLANAR_RGB_CHANNEL_NAMES = ["R", "G", "B"];
function presentPackedRgbAsPlanarChannels(metadata, vivDtype) {
  const pixels = metadata.Pixels;
  const src = _nullishCoalesce$2(pixels.Channels, () => ( []));
  const channels = src.length >= 3 ? src.slice(0, 3).map((ch) => ({
    ...ch,
    SamplesPerPixel: 1
  })) : PLANAR_RGB_CHANNEL_NAMES.map((name, i) => ({
    ..._nullishCoalesce$2(src[0], () => ( {})),
    ID: `Channel:0:${i}`,
    Name: name,
    SamplesPerPixel: 1
  }));
  return {
    ...metadata,
    Pixels: {
      ...pixels,
      SizeC: 3,
      Interleaved: false,
      Type: vivDtype,
      Channels: channels
    }
  };
}
async function loadSingleFileOmeTiff(source, options = {}) {
  const {
    offsets,
    headers,
    pool,
    source: prebuiltSource,
    packedRgb: packedRgbLayout = "interleaved"
  } = options;
  const tiff = await createGeoTiff(source, {
    headers,
    offsets,
    source: prebuiltSource
  });
  const firstImage = await tiff.getImage();
  padTiffSampleTags(firstImage.fileDirectory);
  const packedRgb = isPackedRgbTiffImage(firstImage);
  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );
  const imageCount = await tiff.getImageCount();
  const usableMeta = rootMetaForAvailableIfds(rootMeta, imageCount, packedRgb);
  const images = [];
  let imageIfdOffset = 0;
  for (const rawMetadata of usableMeta) {
    const vivDtype = packedRgb ? guessImageDataType(firstImage) : parsePixelDataType(rawMetadata["Pixels"]["Type"]);
    const presentPlanar = packedRgb && packedRgbLayout === "planar";
    const metadata = packedRgb ? presentPlanar ? presentPackedRgbAsPlanarChannels(rawMetadata, vivDtype) : collapsePackedRgbPixelsMetadata(rawMetadata, vivDtype) : rawMetadata;
    const imageSize = {
      z: metadata["Pixels"]["SizeZ"],
      c: packedRgb ? 1 : metadata["Pixels"]["SizeC"],
      t: metadata["Pixels"]["SizeT"]
    };
    const axes = extractAxesFromPixels(metadata["Pixels"]);
    const pyramidIndexer = createSingleFileOmeTiffPyramidalIndexer(tiff, {
      size: imageSize,
      ifdOffset: imageIfdOffset,
      dimensionOrder: metadata["Pixels"]["DimensionOrder"]
    });
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const sourcePhoto = firstImage.fileDirectory.PhotometricInterpretation;
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata["Pixels"]),
      sourcePhotometricInterpretation: sourcePhoto,
      photometricInterpretation: packedRgb ? presentPlanar ? PHOTOMETRIC_BLACK_IS_ZERO : PHOTOMETRIC_RGB : sourcePhoto
    };
    const data = await Promise.all(
      Array.from({ length: levels }, async (_, level) => {
        const levelImage = await pyramidIndexer({ t: 0, c: 0, z: 0 }, level);
        return new TiffPixelSource(
          (sel) => pyramidIndexer(
            {
              t: _nullishCoalesce$2(sel.t, () => ( 0)),
              c: packedRgb ? 0 : _nullishCoalesce$2(sel.c, () => ( 0)),
              z: _nullishCoalesce$2(sel.z, () => ( 0))
            },
            level
          ),
          vivDtype,
          tileSize,
          getShapeForLevel({
            axes,
            width: levelImage.getWidth(),
            height: levelImage.getHeight()
          }),
          axes.labels,
          meta,
          pool
        );
      })
    );
    images.push({ data, metadata });
    imageIfdOffset += imageSize.t * imageSize.z * imageSize.c;
  }
  return images;
}

addDecoder(5, () => Promise.resolve(LZWDecoder));
function isSupportedCompanionOmeTiffFile(source) {
  return typeof source === "string" && source.endsWith(".companion.ome");
}
async function loadOmeTiff(source, opts = {}) {
  const load = isSupportedCompanionOmeTiffFile(source) ? loadMultifileOmeTiff : loadSingleFileOmeTiff;
  const loaders = await load(source, opts);
  return opts.images === "all" ? loaders : loaders[0];
}
function getImageSelectionName(imageName, imageNumber, imageSelections) {
  return imageSelections.length === 1 ? imageName : `${imageName}_${imageNumber.toString()}`;
}
async function loadMultiTiff(sources, opts = {}) {
  const { pool, headers = {}, name = "MultiTiff" } = opts;
  const tiffImage = [];
  const channelNames = [];
  for (const source of sources) {
    const [s, file] = source;
    const imageSelections = Array.isArray(s) ? s : [s];
    if (typeof file === "string") {
      const parsedFilename = parseFilename(file);
      const extension = _optionalChain$3([parsedFilename, 'access', _31 => _31.extension, 'optionalAccess', _32 => _32.toLowerCase, 'call', _33 => _33()]);
      if (extension === "tif" || extension === "tiff") {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          const curImage = await createGeoTiff(file, {
            headers
          });
          for (let i = 0; i < imageSelections.length; i++) {
            const curSelection = imageSelections[i];
            if (curSelection) {
              const tiff = await curImage.getImage(i);
              tiffImage.push({ selection: curSelection, tiff });
              channelNames[curSelection.c] = getImageSelectionName(
                tiffImageName,
                i,
                imageSelections
              );
            }
          }
        }
      }
    } else {
      const { name: name2 } = parseFilename(file.path);
      if (name2) {
        const curImage = await fromBlob(file);
        for (let i = 0; i < imageSelections.length; i++) {
          const curSelection = imageSelections[i];
          if (curSelection) {
            const tiff = await curImage.getImage(i);
            if (tiff.fileDirectory.SamplesPerPixel > 1) {
              throw new Error(
                `Multiple samples per pixel in tiff not supported as part of a multi-tiff, found ${tiff.fileDirectory.SamplesPerPixel} samples per pixel`
              );
            }
            tiffImage.push({ selection: curSelection, tiff });
            channelNames[curSelection.c] = getImageSelectionName(
              name2,
              i,
              imageSelections
            );
          }
        }
      }
    }
  }
  if (tiffImage.length > 0) {
    return load$2(name, tiffImage, opts.channelNames || channelNames, pool);
  }
  throw new Error("Unable to load image from provided TiffFolder source.");
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const defaultPoolSize = _nullishCoalesce$2(_optionalChain$3([globalThis, 'optionalAccess', _34 => _34.navigator, 'optionalAccess', _35 => _35.hardwareConcurrency]), () => ( 4));
function defaultCreateWorker() {
  return new Worker(new URL("./tiff/lib/decoder.worker.mjs", import.meta.url), {
    type: "module"
  });
}
class WorkerWrapper {
  constructor(worker) {
    __publicField$2(this, "worker");
    __publicField$2(this, "jobIdCounter", 0);
    __publicField$2(this, "jobs", /* @__PURE__ */ new Map());
    this.worker = worker;
    this.worker.addEventListener("message", (e) => this.onWorkerMessage(e));
  }
  getJobCount() {
    return this.jobs.size;
  }
  onWorkerMessage(e) {
    const { jobId, error, ...result } = e.data;
    const job = this.jobs.get(jobId);
    this.jobs.delete(jobId);
    if (!job)
      return;
    if (error)
      job.reject(new Error(error));
    else
      job.resolve(result);
  }
  submitJob(message, transferables = []) {
    const jobId = this.jobIdCounter++;
    const promise = new Promise((resolve, reject) => {
      this.jobs.set(jobId, { resolve, reject });
    });
    this.worker.postMessage({ ...message, jobId }, transferables);
    return promise;
  }
  terminate() {
    this.worker.terminate();
  }
}
class Pool {
  constructor(size = defaultPoolSize, createWorker = defaultCreateWorker) {
    __publicField$2(this, "workerWrappers", null);
    if (size) {
      this.workerWrappers = (async () => {
        const wrappers = [];
        for (let i = 0; i < size; i++) {
          wrappers.push(new WorkerWrapper(createWorker()));
        }
        return wrappers;
      })();
    }
  }
  async decode(fileDirectory, buffer) {
    if (this.workerWrappers) {
      const workerWrapper = (await this.workerWrappers).reduce(
        (a, b) => a.getJobCount() < b.getJobCount() ? a : b
      );
      const { decoded } = await workerWrapper.submitJob(
        { fileDirectory, buffer },
        [buffer]
      );
      return decoded;
    }
    const decoder = await getDecoder(fileDirectory);
    return decoder.decode(fileDirectory, buffer);
  }
  async destroy() {
    if (!this.workerWrappers)
      return;
    const wrappers = await this.workerWrappers;
    this.workerWrappers = null;
    for (const w of wrappers) {
      w.terminate();
    }
  }
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function joinUrlParts(...args) {
  return args.map((part, i) => {
    if (i === 0)
      return part.trim().replace(/[/]*$/g, "");
    return part.trim().replace(/(^[/]*|[/]*$)/g, "");
  }).filter((x) => x.length).join("/");
}
class ReadOnlyStore {
  async keys() {
    return [];
  }
  async deleteItem() {
    return false;
  }
  async setItem() {
    console.warn("Cannot write to read-only store.");
    return false;
  }
}
class FileStore extends ReadOnlyStore {
  constructor(fileMap, rootPrefix = "") {
    super();
    __publicField$1(this, "_map");
    __publicField$1(this, "_rootPrefix");
    this._map = fileMap;
    this._rootPrefix = rootPrefix;
  }
  _key(key) {
    return joinUrlParts(this._rootPrefix, key);
  }
  async get(key) {
    const file = this._map.get(this._key(key));
    if (!file) {
      return void 0;
    }
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }
}

function isOmeZarr(dataShape, Pixels) {
  const { SizeT, SizeC, SizeZ, SizeY, SizeX } = Pixels;
  const omeZarrShape = [SizeT, SizeC, SizeZ, SizeY, SizeX];
  return dataShape.every((size, i) => omeZarrShape[i] === size);
}
function guessBioformatsLabels({ shape }, { Pixels }) {
  if (isOmeZarr(shape, Pixels)) {
    return getLabels("XYZCT");
  }
  const labels = getLabels(Pixels.DimensionOrder);
  labels.forEach((lower, i) => {
    const label = lower.toUpperCase();
    const xmlSize = Pixels[`Size${label}`];
    if (!xmlSize) {
      throw Error(`Dimension ${label} is invalid for OME-XML.`);
    }
    if (shape[i] !== xmlSize) {
      throw Error("Dimension mismatch between zarr source and OME-XML.");
    }
  });
  return labels;
}
function getRootPrefix(files, rootName) {
  const first = files.find((f) => f.path.indexOf(rootName) > 0);
  if (!first) {
    throw Error("Could not find root in store.");
  }
  const prefixLength = first.path.indexOf(rootName) + rootName.length;
  return first.path.slice(0, prefixLength);
}
function isAxis(axisOrLabel) {
  return typeof axisOrLabel[0] !== "string";
}
function castLabels(dimnames) {
  return dimnames;
}
async function loadMultiscales(store, path = "") {
  const location = zarr.root(store);
  const groupLocation = path ? location.resolve(path) : location;
  const grp = await zarr.open(groupLocation, { kind: "group" });
  const unknownAttrs = await grp.attrs;
  const ngff_v0_5_or_later = "ome" in unknownAttrs;
  const rootAttrs = ngff_v0_5_or_later ? unknownAttrs.ome : unknownAttrs;
  let paths = ["0"];
  let labels = castLabels(["t", "c", "z", "y", "x"]);
  if ("multiscales" in rootAttrs) {
    const { datasets, axes } = rootAttrs.multiscales[0];
    paths = datasets.map((d) => d.path);
    if (axes) {
      if (isAxis(axes)) {
        labels = castLabels(axes.map((axis) => axis.name));
      } else {
        labels = castLabels(axes);
      }
    }
  }
  const data = await Promise.all(
    paths.map((p) => zarr.open(groupLocation.resolve(p), { kind: "array" }))
  );
  return {
    data,
    rootAttrs,
    labels
  };
}
function guessTileSize(arr) {
  const interleaved = isInterleaved(arr.shape);
  const [yChunk, xChunk] = arr.chunks.slice(interleaved ? -3 : -2);
  const size = Math.min(yChunk, xChunk);
  return prevPowerOf2(size);
}

function getIndexer(labels) {
  const labelSet = new Set(labels);
  if (labelSet.size !== labels.length) {
    throw new Error("Labels must be unique");
  }
  return (sel) => {
    if (Array.isArray(sel)) {
      return [...sel];
    }
    const selection = Array(labels.length).fill(0);
    for (const [key, value] of Object.entries(sel)) {
      const index = labels.indexOf(key);
      if (index === -1) {
        throw new Error(`Invalid indexer key: ${key}`);
      }
      selection[index] = value;
    }
    return selection;
  };
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const DTYPE_LOOKUP = {
  u1: "Uint8",
  u2: "Uint16",
  u4: "Uint32",
  f4: "Float32",
  f8: "Float64",
  i1: "Int8",
  i2: "Int16",
  i4: "Int32"
};
class BoundsCheckError extends Error {
}
class ZarrPixelSource {
  constructor(data, labels, tileSize) {
    this.labels = labels;
    this.tileSize = tileSize;
    __publicField(this, "_data");
    __publicField(this, "_indexer");
    this._indexer = getIndexer(labels);
    this._data = data;
  }
  get shape() {
    return this._data.shape;
  }
  get dtype() {
    const normalized = this._data.dtype.toLowerCase();
    if (normalized.length === 2 && normalized in DTYPE_LOOKUP) {
      return DTYPE_LOOKUP[normalized];
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  get _xIndex() {
    const interleave = isInterleaved(this._data.shape);
    return this._data.shape.length - (interleave ? 2 : 1);
  }
  _chunkIndex(selection, { x, y }) {
    const sel = this._indexer(selection);
    sel[this._xIndex] = x;
    sel[this._xIndex - 1] = y;
    return sel;
  }
  /**
   * Converts x, y tile indices to zarr dimension Slices within image bounds.
   */
  _getSlices(x, y) {
    const { height, width } = getImageSize(this);
    const [xStart, xStop] = [
      x * this.tileSize,
      Math.min((x + 1) * this.tileSize, width)
    ];
    const [yStart, yStop] = [
      y * this.tileSize,
      Math.min((y + 1) * this.tileSize, height)
    ];
    if (xStart === xStop || yStart === yStop) {
      throw new BoundsCheckError("Tile slice is zero-sized.");
    }
    if (xStart < 0 || yStart < 0 || xStop > width || yStop > height) {
      throw new BoundsCheckError("Tile slice is out of bounds.");
    }
    return [zarr.slice(xStart, xStop), zarr.slice(yStart, yStop)];
  }
  async _getRaw(selection, getOptions) {
    const signal = _optionalChain$3([getOptions, 'optionalAccess', _36 => _36.storeOptions, 'optionalAccess', _37 => _37.signal]);
    const result = await zarr.get(this._data, selection, signal);
    if (typeof result !== "object") {
      throw new Error("Expected object from zarr.get");
    }
    return result;
  }
  async getRaster({
    selection,
    signal
  }) {
    const sel = this._chunkIndex(selection, { x: null, y: null });
    const result = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = result;
    return { data, width, height };
  }
  async getTile(props) {
    const { x, y, selection, signal } = props;
    const [xSlice, ySlice] = this._getSlices(x, y);
    const sel = this._chunkIndex(selection, { x: xSlice, y: ySlice });
    const tile = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = tile;
    return { data, height, width };
  }
  onTileError(err) {
    if (!(err instanceof BoundsCheckError)) {
      throw err;
    }
  }
}

async function load$1(root, xmlSource) {
  let xmlSourceText;
  if (typeof xmlSource !== "string") {
    xmlSourceText = await xmlSource.text();
  } else {
    xmlSourceText = xmlSource;
  }
  const parsed = fromString(xmlSourceText);
  const images = parsed.images || [];
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  const roiMap = new Map(rois.map((roi) => [roi.ID, roi]));
  let imgMeta = images[0];
  if (imgMeta) {
    const imageROIRefs = roiRefs.filter((roiRef) => {
      return true;
    });
    const imageROIs = imageROIRefs.map((roiRef) => roiMap.get(roiRef.ID)).filter(Boolean);
    const { ROIRef: _omitROIRef, ...imgWithoutRefs } = imgMeta;
    imgMeta = { ...imgWithoutRefs, ROIs: imageROIs };
  }
  const { data } = await loadMultiscales(root, "0");
  const labels = guessBioformatsLabels(data[0], imgMeta);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map((arr) => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: imgMeta
  };
}

async function load(store) {
  const { data, rootAttrs, labels } = await loadMultiscales(store);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map((arr) => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}

async function loadOmeZarr(source, options = {}) {
  const store = new FetchStore(source, options.fetchOptions);
  if (_optionalChain$3([options, 'optionalAccess', _38 => _38.type]) !== "multiscales") {
    throw Error("Only multiscale OME-Zarr is supported.");
  }
  return load(store);
}
async function _DEPRECATED_loadBioformatsZarrWithPaths(source, metadataPath, zarrDir, options = {}) {
  if (typeof source === "string") {
    const url = source.endsWith("/") ? source.slice(0, -1) : source;
    const store2 = new FetchStore(`${url}/${zarrDir}`, options.fetchOptions);
    const xmlSource = await fetch(
      `${url}/${metadataPath}`,
      options.fetchOptions
    );
    if (!xmlSource.ok) {
      throw Error("No OME-XML metadata found for store.");
    }
    return load$1(store2, xmlSource);
  }
  const fMap = /* @__PURE__ */ new Map();
  let xmlFile;
  for (const file of source) {
    if (file.name === metadataPath) {
      xmlFile = file;
    } else {
      fMap.set(file.path, file);
    }
  }
  if (!xmlFile) {
    throw Error("No OME-XML metadata found for store.");
  }
  const store = new FileStore(fMap, getRootPrefix(source, zarrDir));
  return load$1(store, xmlFile);
}
async function DEPRECATED_loadBioformatsZarr(source, options = {}) {
  return Promise.any([
    _DEPRECATED_loadBioformatsZarrWithPaths(
      source,
      "METADATA.ome.xml",
      "data.zarr",
      options
    ),
    _DEPRECATED_loadBioformatsZarrWithPaths(
      source,
      "OME/METADATA.ome.xml",
      "",
      options
    )
  ]);
}

function _nullishCoalesce$1(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
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
  const maxSliderValue = _optionalChain$2([domain, 'optionalAccess', _2 => _2[1]]) || getDtypeValues(dtype).max;
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
  const { x, y, z } = _nullishCoalesce$1(_optionalChain$2([loader, 'optionalAccess', _3 => _3.meta, 'optionalAccess', _4 => _4.physicalSizes]), () => ( {}));
  if (_optionalChain$2([x, 'optionalAccess', _5 => _5.size]) && _optionalChain$2([y, 'optionalAccess', _6 => _6.size]) && _optionalChain$2([z, 'optionalAccess', _7 => _7.size])) {
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
  if (!_optionalChain$2([img, 'optionalAccess', _8 => _8.data]) || !img.width || !img.height) {
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
    const numChannels = _optionalChain$2([this, 'access', _9 => _9.props, 'access', _10 => _10.selections, 'optionalAccess', _11 => _11.length]) || 1;
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
  updateState({ props, oldProps, ...rest }) {
    super.updateState({ props, oldProps, ...rest });
    const img = getPreparedImage(props.image);
    if (!img) {
      if (this.state.bitmapTexture) {
        this.state.bitmapTexture.delete();
        this.setState({ bitmapTexture: null });
      }
      return;
    }
    if (props.image === _optionalChain$2([oldProps, 'optionalAccess', _12 => _12.image]) && this.state.bitmapTexture) {
      return;
    }
    if (this.state.bitmapTexture) {
      this.state.bitmapTexture.delete();
    }
    const texture = this.context.device.createTexture({
      width: img.width,
      height: img.height,
      dimension: "2d",
      data: img.data,
      mipLevels: 1,
      format: img.format || "rgba8unorm",
      sampler: {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge"
      }
    });
    this.setState({ bitmapTexture: texture });
  }
  finalizeState() {
    if (this.state.bitmapTexture) {
      this.state.bitmapTexture.delete();
      this.setState({ bitmapTexture: null });
    }
    super.finalizeState();
  }
  renderLayers() {
    const {
      photometricInterpretation,
      transparentColor: transparentColorInHook
    } = this.props;
    const transparentColor = getTransparentColor(photometricInterpretation);
    const image = this.state.bitmapTexture;
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
    return _nullishCoalesce$1(_nullishCoalesce$1(_optionalChain$2([this, 'access', _13 => _13.props, 'access', _14 => _14.selections, 'optionalAccess', _15 => _15.length]), () => ( _optionalChain$2([this, 'access', _16 => _16.props, 'access', _17 => _17.channels, 'optionalAccess', _18 => _18.length]))), () => ( MAX_CHANNELS));
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
    return _optionalChain$2([extensions, 'optionalAccess', _19 => _19.some, 'call', _20 => _20((e) => {
      const shaders = e.getShaders.call(this, e);
      const { inject = {}, modules = [] } = shaders;
      const definesInjection = inject[hookName];
      const moduleDefinesInjection = modules.some((m) => _optionalChain$2([m, 'optionalAccess', _21 => _21.inject, 'access', _22 => _22[hookName]]));
      return definesInjection || moduleDefinesInjection;
    })]);
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
      Object.values(this.state.textures).forEach((tex) => _optionalChain$2([tex, 'optionalAccess', _23 => _23.delete, 'call', _24 => _24()]));
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
    const colormapChanged = props.colormap !== _optionalChain$2([oldProps, 'optionalAccess', _25 => _25.colormap]);
    if (changeFlags.extensionsChanged || props.interpolation !== oldProps.interpolation || colormapChanged || (_nullishCoalesce$1(_optionalChain$2([props, 'access', _26 => _26.selections, 'optionalAccess', _27 => _27.length]), () => ( 0))) !== (_nullishCoalesce$1(_optionalChain$2([oldProps, 'access', _28 => _28.selections, 'optionalAccess', _29 => _29.length]), () => ( 0)))) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
      this.getAttributeManager().invalidateAll();
    }
    if (props.channelData !== oldProps.channelData && _optionalChain$2([props, 'access', _30 => _30.channelData, 'optionalAccess', _31 => _31.data]) !== _optionalChain$2([oldProps, 'access', _32 => _32.channelData, 'optionalAccess', _33 => _33.data]) || props.interpolation !== oldProps.interpolation) {
      this.loadChannelTextures(props.channelData);
    }
    const attributeManager = this.getAttributeManager();
    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate("positions");
    }
    const texturesToBind = _nullishCoalesce$1(this._newTexturesFromLoadThisFrame, () => ( this.state.textures));
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
      Object.values(this.state.textures).forEach((tex) => _optionalChain$2([tex, 'optionalAccess', _34 => _34.delete, 'call', _35 => _35()]));
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
      data: _nullishCoalesce$1(_optionalChain$2([attrs, 'access', _36 => _36.cast, 'optionalCall', _37 => _37(data)]), () => ( data)),
      // luma.gl 9.3: `mipmaps` is ignored; texStorage2D needs a positive mipLevels.
      mipLevels: 1,
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
    return _nullishCoalesce$1(_nullishCoalesce$1(_optionalChain$2([this, 'access', _38 => _38.props, 'access', _39 => _39.selections, 'optionalAccess', _40 => _40.length]), () => ( _optionalChain$2([this, 'access', _41 => _41.props, 'access', _42 => _42.channels, 'optionalAccess', _43 => _43.length]))), () => ( MAX_CHANNELS));
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
          width: _optionalChain$2([rasters, 'access', _44 => _44[0], 'optionalAccess', _45 => _45.width]),
          height: _optionalChain$2([rasters, 'access', _46 => _46[0], 'optionalAccess', _47 => _47.height])
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

function getPyramidZoomLevels(loader) {
  if (!Array.isArray(loader) || loader.length === 0) {
    return [0];
  }
  const { width: baseWidth } = getImageSize(loader[0]);
  return loader.map((level) => {
    const { width } = getImageSize(level);
    return 0 - Math.round(Math.log2(baseWidth / width));
  });
}
function snapToAvailableZoom(z, levelZooms) {
  const target = Math.round(z);
  for (const lz of levelZooms) {
    if (lz <= target) {
      return lz;
    }
  }
  return levelZooms[levelZooms.length - 1];
}
function getLevelScale(loader, levelIndex) {
  const { width: baseWidth } = getImageSize(loader[0]);
  const { width } = getImageSize(loader[levelIndex]);
  return baseWidth / width;
}
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
  let scale = 2 ** Math.round(-z);
  let boundLeft = left;
  let boundTop = top;
  if (Array.isArray(loader) && loader.length > 1 && base.labels) {
    const levelZooms = getPyramidZoomLevels(loader);
    const zNat = snapToAvailableZoom(z, levelZooms);
    scale = 2 ** Math.round(-zNat);
    const factor = 2 ** (Math.round(z) - zNat);
    if (factor !== 1) {
      const xNat = Math.floor(x / factor);
      const yNat = Math.floor(y / factor);
      const { tileSize } = base;
      boundLeft = xNat * tileSize * scale;
      boundTop = yNat * tileSize * scale;
    }
  }
  const bounds = [
    boundLeft,
    boundTop + data.height * scale,
    boundLeft + data.width * scale,
    boundTop
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
    const levelZooms = getPyramidZoomLevels(loader);
    const getTileData = async ({ index: { x, y, z }, signal }) => {
      if (!selections || selections.length === 0) {
        return null;
      }
      const zNat = snapToAvailableZoom(z, levelZooms);
      const resolution = levelZooms.indexOf(zNat);
      const factor = 2 ** (Math.round(z) - zNat);
      const xNat = Math.floor(x / factor);
      const yNat = Math.floor(y / factor);
      const getTile = (selection) => {
        const config = { x: xNat, y: yNat, selection, signal };
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
      minZoom: levelZooms[levelZooms.length - 1],
      maxZoom: 0,
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy: refinementStrategy || (opacity === 1 ? "best-available" : "no-overlap"),
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. Key selections by t/c/z values so a new array with the same
      // planes (contrast, color, visibility) does not drop the cache.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [
          loader,
          _optionalChain$2([selections, 'optionalAccess', _48 => _48.length]) ? selections.map((s) => `${_nullishCoalesce$1(_optionalChain$2([s, 'optionalAccess', _49 => _49.t]), () => ( 0))},${_nullishCoalesce$1(_optionalChain$2([s, 'optionalAccess', _50 => _50.c]), () => ( 0))},${_nullishCoalesce$1(_optionalChain$2([s, 'optionalAccess', _51 => _51.z]), () => ( 0))}`).join("|") : ""
        ]
      },
      onTileError: onTileError || loader[0].onTileError
    });
    const lowestResolution = loader[loader.length - 1];
    const implementsGetRaster = typeof lowestResolution.getRaster === "function";
    const layerModelMatrix = modelMatrix ? modelMatrix.clone() : new Matrix4();
    const baseLayer = implementsGetRaster && !excludeBackground && new ImageLayer(this.props, {
      id: `Background-Image-${id}`,
      loader: lowestResolution,
      modelMatrix: layerModelMatrix.scale(
        getLevelScale(loader, loader.length - 1)
      ),
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
    const levelScale = getLevelScale(loader, z);
    const overview = new ImageLayer(this.props, {
      id: `viewport-${id}`,
      modelMatrix: new Matrix4().scale(levelScale * overviewScale),
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
    return _nullishCoalesce$1(_nullishCoalesce$1(_optionalChain$2([this, 'access', _52 => _52.props, 'access', _53 => _53.selections, 'optionalAccess', _54 => _54.length]), () => ( _optionalChain$2([this, 'access', _55 => _55.props, 'access', _56 => _56.channels, 'optionalAccess', _57 => _57.length]))), () => ( MAX_CHANNELS));
  }
  /**
   * Returns the number of planes for this layer instance.
   * Implements VivLayer interface.
   */
  getNumPlanes() {
    const { clippingPlanes } = this.props;
    return _optionalChain$2([clippingPlanes, 'optionalAccess', _58 => _58.length]) || NUM_PLANES_DEFAULT;
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
    return _optionalChain$2([extensions, 'optionalAccess', _59 => _59.some, 'call', _60 => _60((e) => {
      const shaders = e.getShaders.call(this, e);
      if (shaders) {
        const { inject = {}, modules = [] } = shaders;
        const definesInjection = inject[hookName];
        const moduleDefinesInjection = modules.some((m) => _optionalChain$2([m, 'optionalAccess', _61 => _61.inject, 'optionalAccess', _62 => _62[hookName]]));
        return definesInjection || moduleDefinesInjection;
      }
      return false;
    })]);
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
      Object.values(this.state.textures).forEach((tex) => _optionalChain$2([tex, 'optionalAccess', _63 => _63.delete, 'call', _64 => _64()]));
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
    const channelCountChanged = (_nullishCoalesce$1(_optionalChain$2([props, 'access', _65 => _65.selections, 'optionalAccess', _66 => _66.length]), () => ( 0))) !== (_nullishCoalesce$1(_optionalChain$2([oldProps, 'optionalAccess', _67 => _67.selections, 'optionalAccess', _68 => _68.length]), () => ( 0)));
    if (changeFlags.extensionsChanged || props.colormap !== oldProps.colormap || props.renderingMode !== oldProps.renderingMode || props.clippingPlanes.length !== oldProps.clippingPlanes.length || channelCountChanged) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
    }
    if (props.channelData && _optionalChain$2([props, 'optionalAccess', _69 => _69.channelData, 'optionalAccess', _70 => _70.data]) !== _optionalChain$2([oldProps, 'optionalAccess', _71 => _71.channelData, 'optionalAccess', _72 => _72.data])) {
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
      _optionalChain$2([selections, 'optionalAccess', _73 => _73.length]) || 0,
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
    const texturesToBind = _nullishCoalesce$1(this._newTexturesFromLoadThisFrame, () => ( this.state.textures));
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
      Object.values(this.state.textures).forEach((tex) => _optionalChain$2([tex, 'optionalAccess', _74 => _74.delete, 'call', _75 => _75()]));
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
      data: _nullishCoalesce$1(_optionalChain$2([attrs, 'access', _76 => _76.cast, 'optionalCall', _77 => _77(data)]), () => ( data)),
      format: attrs.format,
      mipLevels: 1,
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
          width: _optionalChain$2([volumes, 'access', _78 => _78[0], 'optionalAccess', _79 => _79.width]),
          height: _optionalChain$2([volumes, 'access', _80 => _80[0], 'optionalAccess', _81 => _81.height]),
          depth: _optionalChain$2([volumes, 'access', _82 => _82[0], 'optionalAccess', _83 => _83.depth])
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

function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
class VivView {
  constructor({ id, x = 0, y = 0, height, width }) {
    this.width = width;
    this.height = height;
    this.id = id;
    this.x = x;
    this.y = y;
  }
  /**
   * Create a DeckGL view based on this class.
   * @returns {View} The DeckGL View for this class.
   */
  getDeckGlView() {
    return new OrthographicView({
      controller: true,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y
    });
  }
  /**
   * Create a viewState for this class, checking the id to make sure this class and veiwState match.
   * @param {Object} args
   * @param {object} [args.viewState] incoming ViewState object from deck.gl update.
   * @param {object} [args.oldViewState] old ViewState object from deck.gl.
   * @param {object} [args.currentViewState] current ViewState object in react state.
   * @returns {?object} ViewState for this class (or null by default if the ids do not match).
   */
  filterViewState({ viewState }) {
    const { id, height, width } = this;
    return viewState.id === id ? { height, width, ...viewState } : null;
  }
  /**
   * Create a layer for this instance.
   * @param {Object} args
   * @param {Object<string,Object>} args.viewStates ViewStates for all current views.
   * @param {Object} args.props Props for this instance.
   * @returns {Layer} Instance of a layer.
   */
  getLayers({ viewStates, props }) {
  }
}

function getVivId(id) {
  return `-#${id}#`;
}
function getDefaultInitialViewState(loader, viewSize, zoomBackOff = 0, use3d = false, modelMatrix) {
  const source = Array.isArray(loader) ? loader[0] : loader;
  const { width: pixelWidth, height: pixelHeight } = getImageSize(source);
  const scale = (modelMatrix || new Matrix4()).getScale();
  const [trueWidth, trueHeight] = [
    scale[0] * pixelWidth,
    scale[1] * pixelHeight
  ];
  const depth = source.shape[source.labels.indexOf("z")];
  const zoom = Math.log2(
    Math.min(viewSize.width / trueWidth, viewSize.height / trueHeight)
  ) - zoomBackOff;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const loaderInitialViewState = {
    target: (modelMatrix || new Matrix4()).transformPoint(
      (use3d ? physicalSizeScalingMatrix : new Matrix4()).transformPoint([
        pixelWidth / 2,
        pixelHeight / 2,
        use3d ? depth / 2 : 0
      ])
    ),
    zoom
  };
  return loaderInitialViewState;
}
function getImageLayer(id, props) {
  const { loader } = props;
  const sourceName = _optionalChain$1([loader, 'access', _ => _[0], 'optionalAccess', _2 => _2.constructor, 'optionalAccess', _3 => _3.name]);
  const Layer = loader.length > 1 ? MultiscaleImageLayer : ImageLayer;
  const layerLoader = loader.length > 1 ? loader : loader[0];
  return new Layer({
    ...props,
    id: `${sourceName}${getVivId(id)}`,
    viewportId: id,
    loader: layerLoader
  });
}

const OVERVIEW_VIEW_ID = "overview";
class OverviewController extends Controller {
  constructor(props) {
    super(props);
    this.events = ["click"];
  }
  handleEvent(event) {
    if (event.type !== "click") {
      return;
    }
    let [x, y] = this.getCenter(event);
    const { width, height, zoom, scale } = this.props;
    if (x < 0 || y < 0 || x > width || y > height) {
      return;
    }
    const scaleFactor = 1 / (2 ** zoom * scale);
    x *= scaleFactor;
    y *= scaleFactor;
    if (this.onViewStateChange) {
      this.onViewStateChange({ viewState: { target: [x, y, 0] } });
    }
  }
}
class OverviewView extends VivView {
  constructor({
    id,
    loader,
    detailHeight,
    detailWidth,
    scale = 0.2,
    margin = 25,
    position = "bottom-right",
    minimumWidth = 150,
    maximumWidth = 350,
    minimumHeight = 150,
    maximumHeight = 350,
    clickCenter = true
  }) {
    super({ id });
    this.margin = margin;
    this.loader = loader;
    this.position = position;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({
      detailWidth,
      detailHeight,
      scale,
      minimumWidth,
      maximumWidth,
      minimumHeight,
      maximumHeight
    });
    this._setXY();
    this.clickCenter = clickCenter;
  }
  /**
   * Set the image-pixel scale and height and width based on detail view.
   */
  _setHeightWidthScale({
    detailWidth,
    detailHeight,
    scale,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight
  }) {
    const numLevels = this.loader.length;
    const { width: rasterWidth, height: rasterHeight } = getImageSize(
      this.loader[0]
    );
    this._imageWidth = rasterWidth;
    this._imageHeight = rasterHeight;
    if (rasterWidth > rasterHeight) {
      const heightWidthRatio = rasterHeight / rasterWidth;
      this.width = Math.min(
        maximumWidth,
        Math.max(detailWidth * scale, minimumWidth)
      );
      this.height = this.width * heightWidthRatio;
      this.scale = 2 ** (numLevels - 1) / rasterWidth * this.width;
    } else {
      const widthHeightRatio = rasterWidth / rasterHeight;
      this.height = Math.min(
        maximumHeight,
        Math.max(detailHeight * scale, minimumHeight)
      );
      this.width = this.height * widthHeightRatio;
      this.scale = 2 ** (numLevels - 1) / rasterHeight * this.height;
    }
  }
  /**
   * Set the x and y (top left corner) of this overview relative to the detail.
   */
  _setXY() {
    const { height, width, margin, position, detailWidth, detailHeight } = this;
    switch (position) {
      case "bottom-right": {
        this.x = detailWidth - width - margin;
        this.y = detailHeight - height - margin;
        break;
      }
      case "top-right": {
        this.x = detailWidth - width - margin;
        this.y = margin;
        break;
      }
      case "top-left": {
        this.x = margin;
        this.y = margin;
        break;
      }
      case "bottom-left": {
        this.x = margin;
        this.y = detailHeight - height - margin;
        break;
      }
      default: {
        throw new Error(
          `overviewLocation prop needs to be one of ['bottom-right', 'top-right', 'top-left', 'bottom-left']`
        );
      }
    }
  }
  getDeckGlView() {
    const { scale, clickCenter } = this;
    const controller = clickCenter && { type: OverviewController, scale };
    return new OrthographicView({
      controller,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y,
      clear: true
    });
  }
  filterViewState({ viewState: _viewState }) {
    const { _imageWidth, _imageHeight, scale, id, height, width } = this;
    return {
      id,
      height,
      width,
      target: [_imageWidth * scale / 2, _imageHeight * scale / 2, 0],
      zoom: -(this.loader.length - 1)
    };
  }
  getLayers({ viewStates, props }) {
    const { detail, overview } = viewStates;
    if (!detail) {
      throw new Error("Overview requires a viewState with id detail");
    }
    const boundingBox = makeBoundingBox(detail).map(
      (coords) => coords.map((e) => e * this.scale)
    );
    const overviewLayer = new OverviewLayer(props, {
      id: getVivId(this.id),
      boundingBox,
      overviewScale: this.scale,
      zoom: -overview.zoom
    });
    return [overviewLayer];
  }
}

const DETAIL_VIEW_ID = "detail";
class DetailView extends VivView {
  constructor({ id, x = 0, y = 0, height, width }) {
    super({ id, x, y, height, width });
  }
  getLayers({ props }) {
    const { id } = this;
    return [getImageLayer(id, props)];
  }
  filterViewState({ viewState, currentViewState }) {
    if (viewState.id === OVERVIEW_VIEW_ID) {
      const { target } = viewState;
      if (target) {
        return { ...currentViewState, target };
      }
    }
    return super.filterViewState({ viewState });
  }
}

function getViewZoom({ zoom, zoomX, zoomY } = {}) {
  if (zoomX != null) {
    return zoomX;
  }
  if (zoomY != null) {
    return zoomY;
  }
  if (Array.isArray(zoom)) {
    return zoom[0];
  }
  return zoom;
}
class SideBySideView extends VivView {
  constructor({
    id,
    x = 0,
    y = 0,
    height,
    width,
    linkedIds = [],
    panLock = true,
    zoomLock = true,
    viewportOutlineColor = [255, 255, 255],
    viewportOutlineWidth = 10
  }) {
    super({ id, x, y, height, width });
    this.linkedIds = linkedIds;
    this.panLock = panLock;
    this.zoomLock = zoomLock;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }
  filterViewState({ viewState, oldViewState, currentViewState }) {
    const { id: viewStateId } = viewState;
    const { id, height, width, linkedIds, panLock, zoomLock } = this;
    if (oldViewState && linkedIds.indexOf(viewStateId) !== -1 && (zoomLock || panLock)) {
      const [currentX, currentY, currentZ = 0] = currentViewState.target;
      let zoom = getViewZoom(currentViewState);
      let target = [currentX, currentY, currentZ];
      if (zoomLock) {
        const dZoom = getViewZoom(viewState) - getViewZoom(oldViewState);
        zoom = zoom + dZoom;
      }
      if (panLock) {
        const [oldX, oldY] = oldViewState.target;
        const [newX, newY] = viewState.target;
        target = [currentX + (newX - oldX), currentY + (newY - oldY), currentZ];
      }
      return { id, target, zoom, height, width };
    }
    if (viewState.id === id) {
      return {
        id,
        target: viewState.target,
        zoom: getViewZoom(viewState),
        height,
        width
      };
    }
    return {
      id,
      target: currentViewState.target,
      zoom: getViewZoom(currentViewState),
      height,
      width
    };
  }
  getLayers({ props, viewStates }) {
    const { id, viewportOutlineColor, viewportOutlineWidth, height, width } = this;
    const layerViewState = viewStates[id];
    const boundingBox = makeBoundingBox({ ...layerViewState, height, width });
    const layers = [getImageLayer(id, props)];
    const border = new PolygonLayer({
      id: `viewport-outline-${getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: (f) => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -getViewZoom(layerViewState)
    });
    layers.push(border);
    return layers;
  }
}

const SCALEBAR_VIEW_ID = "scalebar";
class ScaleBarView extends VivView {
  constructor({
    id,
    width,
    height,
    loader,
    imageViewId,
    position = "bottom-right",
    length = 0.05,
    snap = false,
    x = 0,
    y = 0
  }) {
    super({ id, width, height });
    this.id = id;
    this.loader = loader;
    this.position = position;
    this.length = length;
    this.snap = snap;
    this.imageViewId = imageViewId;
    this.x = x;
    this.y = y;
  }
  getDeckGlView() {
    const { id, height, width, x, y } = this;
    return new OrthographicView({
      id,
      controller: false,
      // Disable interaction on scale bar view
      height,
      width,
      x: this.x,
      y: this.y
    });
  }
  filterViewState({ viewState }) {
    const { id, height, width } = this;
    return {
      id,
      height,
      width,
      target: [width / 2, height / 2, 0],
      zoom: 0
    };
  }
  getLayers({ viewStates }) {
    const { loader } = this;
    const layers = [];
    if (_optionalChain$1([loader, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.meta, 'optionalAccess', _6 => _6.physicalSizes, 'optionalAccess', _7 => _7.x])) {
      const { id, height, width, position, length, snap, imageViewId } = this;
      const { size, unit } = loader[0].meta.physicalSizes.x;
      const imageViewState = viewStates[imageViewId];
      if (!imageViewState) {
        return layers;
      }
      const layerId = getVivId(id);
      layers.push(
        new ScaleBarLayer({
          id: layerId,
          unit,
          size,
          position,
          imageViewState: { ...imageViewState },
          length,
          snap,
          height,
          width
        })
      );
    }
    return layers;
  }
}

class VolumeView extends VivView {
  constructor({ target, useFixedAxis, ...args }) {
    super(args);
    this.target = target;
    this.useFixedAxis = useFixedAxis;
  }
  getDeckGlView() {
    const { height, width, id, x, y } = this;
    return new OrbitView({
      id,
      controller: true,
      height,
      width,
      x,
      y,
      orbitAxis: "Y"
    });
  }
  filterViewState({ viewState }) {
    const { id, target, useFixedAxis } = this;
    return viewState.id === id ? {
      ...viewState,
      // fix the center of the camera if desired
      target: useFixedAxis ? target : viewState.target
    } : null;
  }
  getLayers({ props }) {
    const { loader } = props;
    const { id } = this;
    const layers = [
      new VolumeLayer(props, {
        id: `${loader.type}${getVivId(id)}`
      })
    ];
    return layers;
  }
}

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const areViewStatesEqual = (viewState, otherViewState) => {
  return otherViewState === viewState || _optionalChain([viewState, 'optionalAccess', _ => _.zoom]) === _optionalChain([otherViewState, 'optionalAccess', _2 => _2.zoom]) && _optionalChain([viewState, 'optionalAccess', _3 => _3.rotationX]) === _optionalChain([otherViewState, 'optionalAccess', _4 => _4.rotationX]) && _optionalChain([viewState, 'optionalAccess', _5 => _5.rotationOrbit]) === _optionalChain([otherViewState, 'optionalAccess', _6 => _6.rotationOrbit]) && equal(_optionalChain([viewState, 'optionalAccess', _7 => _7.target]), _optionalChain([otherViewState, 'optionalAccess', _8 => _8.target]));
};
class VivViewerWrapper extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewStates: {}
    };
    const { viewStates } = this.state;
    const { views, viewStates: initialViewStates } = this.props;
    views.forEach((view) => {
      viewStates[view.id] = view.filterViewState({
        viewState: initialViewStates.find((v) => v.id === view.id)
      });
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
    this.onHover = this.onHover.bind(this);
  }
  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {object} args
   * @param {object} args.layer Layer being updated.
   * @param {object} args.viewport Viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport.
   */
  layerFilter({ layer, viewport }) {
    return layer.id.includes(getVivId(viewport.id));
  }
  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL
   * (hence the need for storing viewState in state).
   */
  _onViewStateChange({ viewId, viewState, interactionState, oldViewState }) {
    const { views, onViewStateChange } = this.props;
    viewState = _optionalChain([onViewStateChange, 'optionalCall', _9 => _9({
      viewId,
      viewState,
      interactionState,
      oldViewState
    })]) || viewState;
    this.setState((prevState) => {
      const viewStates = {};
      const leaderPreviousViewState = _nullishCoalesce(prevState.viewStates[viewId], () => ( oldViewState));
      views.forEach((view) => {
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: { ...viewState, id: viewId },
          oldViewState: leaderPreviousViewState,
          currentViewState
        });
      });
      return { viewStates };
    });
    return viewState;
  }
  componentDidUpdate(prevProps) {
    const { props } = this;
    const { views } = props;
    const viewStates = { ...this.state.viewStates };
    let anyChanged = false;
    views.forEach((view) => {
      const currViewState = _optionalChain([props, 'access', _10 => _10.viewStates, 'optionalAccess', _11 => _11.find, 'call', _12 => _12(
        (viewState) => viewState.id === view.id
      )]);
      if (!currViewState) {
        return;
      }
      const prevViewState = _optionalChain([prevProps, 'access', _13 => _13.viewStates, 'optionalAccess', _14 => _14.find, 'call', _15 => _15(
        (viewState) => viewState.id === view.id
      )]);
      if (areViewStatesEqual(currViewState, prevViewState)) {
        return;
      }
      anyChanged = true;
      const { height, width } = view;
      viewStates[view.id] = view.filterViewState({
        viewState: {
          ...currViewState,
          height,
          width,
          id: view.id
        }
      });
    });
    if (anyChanged) {
      this.setState({ viewStates });
    }
  }
  /**
   * This updates the viewStates' height and width with the newest height and
   * width on any call where the viewStates changes (i.e resize events),
   * using the previous state (falling back on the view's initial state) for target x and y, zoom level etc.
   */
  static getDerivedStateFromProps(props, prevState) {
    const { views, viewStates: viewStatesProps } = props;
    if (views.some(
      (view) => !prevState.viewStates[view.id] || view.height !== prevState.viewStates[view.id].height || view.width !== prevState.viewStates[view.id].width
    )) {
      const viewStates = {};
      views.forEach((view) => {
        const { height, width } = view;
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: {
            ...currentViewState || viewStatesProps.find((v) => v.id === view.id),
            height,
            width,
            id: view.id
          }
        });
      });
      return { viewStates };
    }
    return prevState;
  }
  onHover(info, event) {
    const { tile, coordinate, sourceLayer: layer } = info;
    const { onHover, hoverHooks } = this.props;
    if (onHover) {
      onHover(info, event);
    }
    if (!hoverHooks || !coordinate || !layer) {
      return null;
    }
    const { handleValue = () => {
    }, handleCoordnate = () => {
    } } = hoverHooks;
    let hoverData;
    if (layer.id.includes("Tiled")) {
      if (!_optionalChain([tile, 'optionalAccess', _16 => _16.content])) {
        return null;
      }
      const {
        content,
        bbox,
        index: { z }
      } = tile;
      if (!content.data || !bbox) {
        return null;
      }
      const { data, width, height } = content;
      const { left, right, top, bottom } = bbox;
      const bounds = [
        left,
        data.height < layer.tileSize ? height : bottom,
        data.width < layer.tileSize ? width : right,
        top
      ];
      if (!data) {
        return null;
      }
      const layerZoomScale = Math.max(1, 2 ** Math.round(-z));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map((d) => d[coords]);
    } else {
      const { channelData } = layer.props;
      if (!channelData) {
        return null;
      }
      const { data, width, height } = channelData;
      if (!data || !width || !height) {
        return null;
      }
      const bounds = [0, height, width, 0];
      const { zoom } = layer.context.viewport;
      const layerZoomScale = Math.max(1, 2 ** Math.floor(-zoom));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map((d) => d[coords]);
    }
    handleValue(hoverData);
    handleCoordnate(coordinate);
  }
  /**
   * This renders the layers in the DeckGL context.
   */
  _renderLayers() {
    const { onHover } = this;
    const { viewStates } = this.state;
    const { views, layerProps } = this.props;
    return views.map(
      (view, i) => view.getLayers({
        viewStates,
        props: {
          ...layerProps[i],
          onHover
        }
      })
    );
  }
  render() {
    const { views, useDevicePixels = true, deckProps } = this.props;
    const { viewStates } = this.state;
    const deckGLViews = views.map((view) => view.getDeckGlView());
    return /* @__PURE__ */ React.createElement(
      DeckGL,
      {
        ..._nullishCoalesce(deckProps, () => ( {})),
        layerFilter: this.layerFilter,
        layers: _optionalChain([deckProps, 'optionalAccess', _17 => _17.layers]) === void 0 ? [...this._renderLayers()] : [...this._renderLayers(), ...deckProps.layers],
        onViewStateChange: this._onViewStateChange,
        views: deckGLViews,
        viewState: viewStates,
        useDevicePixels,
        getCursor: ({ isDragging }) => {
          return isDragging ? "grabbing" : "crosshair";
        }
      }
    );
  }
}
const VivViewer = (props) => /* @__PURE__ */ React.createElement(VivViewerWrapper, { ...props });

const PictureInPictureViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    overview,
    overviewOn,
    selections,
    hoverHooks = { handleValue: () => {
    }, handleCoordinate: () => {
    } },
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    clickCenter = true,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const detailViewState = _optionalChain([viewStatesProp, 'optionalAccess', _18 => _18.find, 'call', _19 => _19((v) => v.id === DETAIL_VIEW_ID)]);
  const baseViewState = React.useMemo(() => {
    return detailViewState || getDefaultInitialViewState(loader, { height, width }, 0.5);
  }, [loader, detailViewState]);
  const detailView = new DetailView({
    id: DETAIL_VIEW_ID,
    height,
    width
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  const viewStates = [{ ...baseViewState, id: DETAIL_VIEW_ID }];
  const scalebarViewState = _nullishCoalesce(_optionalChain([viewStatesProp, 'optionalAccess', _20 => _20.find, 'call', _21 => _21(
    (v) => v.id === SCALEBAR_VIEW_ID
  )]), () => ( {
    id: SCALEBAR_VIEW_ID,
    zoom: 0,
    target: [width / 2, height / 2, 0]
  }));
  const scaleBarView = new ScaleBarView({
    id: SCALEBAR_VIEW_ID,
    width,
    height,
    loader,
    snap: snapScaleBar,
    imageViewId: DETAIL_VIEW_ID
  });
  views.push(scaleBarView);
  layerProps.push(layerConfig);
  viewStates.push(scalebarViewState);
  if (overviewOn && loader) {
    const overviewViewState = _nullishCoalesce(_optionalChain([viewStatesProp, 'optionalAccess', _22 => _22.find, 'call', _23 => _23(
      (v) => v.id === OVERVIEW_VIEW_ID
    )]), () => ( { id: OVERVIEW_VIEW_ID }));
    const overviewView = new OverviewView({
      id: OVERVIEW_VIEW_ID,
      loader,
      detailHeight: height,
      detailWidth: width,
      clickCenter,
      ...overview
    });
    views.push(overviewView);
    layerProps.push({ ...layerConfig, lensEnabled: false });
    viewStates.push(overviewViewState);
  }
  if (!loader)
    return null;
  return /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      viewStates,
      hoverHooks,
      onViewStateChange,
      onHover,
      deckProps
    }
  );
};

const SideBySideViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    panLock,
    selections,
    zoomLock,
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const leftViewState = _optionalChain([viewStatesProp, 'optionalAccess', _24 => _24.find, 'call', _25 => _25((v) => v.id === "left")]);
  const rightViewState = _optionalChain([viewStatesProp, 'optionalAccess', _26 => _26.find, 'call', _27 => _27((v) => v.id === "right")]);
  const leftId = `left-${SCALEBAR_VIEW_ID}`;
  const rightId = `right-${SCALEBAR_VIEW_ID}`;
  const leftScalebarViewState = _optionalChain([viewStatesProp, 'optionalAccess', _28 => _28.find, 'call', _29 => _29((v) => v.id === leftId)]);
  const rightScalebarViewState = _optionalChain([viewStatesProp, 'optionalAccess', _30 => _30.find, 'call', _31 => _31((v) => v.id === rightId)]);
  const viewStates = React.useMemo(() => {
    if (leftViewState && rightViewState) {
      return viewStatesProp;
    }
    const defaultViewState = getDefaultInitialViewState(
      loader,
      { height, width: width / 2 },
      0.5
    );
    const target = [width / 4, height / 2, 0];
    return [
      leftViewState || { ...defaultViewState, id: "left" },
      rightViewState || { ...defaultViewState, id: "right" },
      _nullishCoalesce(leftScalebarViewState, () => ( { zoom: 0, target, id: leftId })),
      _nullishCoalesce(rightScalebarViewState, () => ( { zoom: 0, target, id: rightId }))
    ];
  }, [loader, leftViewState, rightViewState]);
  const detailViewLeft = new SideBySideView({
    id: "left",
    linkedIds: ["right"],
    panLock,
    zoomLock,
    height,
    width: width / 2
  });
  const detailViewRight = new SideBySideView({
    id: "right",
    x: width / 2,
    linkedIds: ["left"],
    panLock,
    zoomLock,
    height,
    width: width / 2
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const leftScaleBarView = new ScaleBarView({
    id: leftId,
    width: width / 2,
    height,
    loader,
    snap: snapScaleBar,
    imageViewId: "left"
  });
  const rightScaleBarView = new ScaleBarView({
    id: rightId,
    width: width / 2,
    height,
    x: width / 2,
    loader,
    snap: snapScaleBar,
    imageViewId: "right"
  });
  const views = [
    detailViewRight,
    detailViewLeft,
    leftScaleBarView,
    rightScaleBarView
  ];
  const layerProps = [layerConfig, layerConfig, layerConfig, layerConfig];
  const finalViewStates = [...viewStates];
  return loader ? /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      onViewStateChange,
      onHover,
      viewStates: finalViewStates,
      deckProps
    }
  ) : null;
};

const VolumeViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    resolution = Math.max(0, loader.length - 1),
    modelMatrix,
    onViewStateChange,
    xSlice = null,
    ySlice = null,
    zSlice = null,
    onViewportLoad,
    height: screenHeight,
    width: screenWidth,
    viewStates: viewStatesProp,
    clippingPlanes = [],
    useFixedAxis = true,
    extensions = [new ColorPalette3DExtensions.AdditiveBlendExtension()]
  } = props;
  const volumeViewState = _optionalChain([viewStatesProp, 'optionalAccess', _32 => _32.find, 'call', _33 => _33((state) => _optionalChain([state, 'optionalAccess', _34 => _34.id]) === "3d")]);
  const initialViewState = React.useMemo(() => {
    if (volumeViewState) {
      return volumeViewState;
    }
    const viewState = getDefaultInitialViewState(
      loader,
      { height: screenHeight, width: screenWidth },
      1,
      true,
      modelMatrix
    );
    return {
      ...viewState,
      rotationX: 0,
      rotationOrbit: 0
    };
  }, [loader, resolution, modelMatrix]);
  const viewStates = [volumeViewState || { ...initialViewState, id: "3d" }];
  const volumeView = new VolumeView({
    id: "3d",
    target: viewStates[0].target,
    useFixedAxis
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    extensions,
    modelMatrix,
    // Slightly delay to avoid issues with a render in the middle of a deck.gl layer state update.
    onViewportLoad: () => setTimeout(onViewportLoad, 0),
    clippingPlanes
  };
  const views = [volumeView];
  const layerProps = [layerConfig];
  return loader ? /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      viewStates,
      onViewStateChange,
      useDevicePixels: false
    }
  ) : null;
};

export { AdditiveColormap3DExtensions, AdditiveColormapExtension, BitmapLayer, COLORMAPS, ColorPalette3DExtensions, ColorPaletteExtension, DEPRECATED_loadBioformatsZarr, DETAIL_VIEW_ID, DTYPE_VALUES, DetailView, ImageLayer, LensExtension, MAX_CHANNELS, MultiscaleImageLayer, OVERVIEW_VIEW_ID, OverviewLayer, OverviewView, PHOTOMETRIC_BLACK_IS_ZERO, PHOTOMETRIC_RGB, PHOTOMETRIC_YCBCR, PictureInPictureViewer, Pool, RENDERING_MODES, SIGNAL_ABORTED, ScaleBarLayer, SideBySideView, SideBySideViewer, TiffPixelSource, VivLayerExtension, VivShaderAssembler, VivView, VivViewer, VolumeLayer, VolumeView, VolumeViewer, XR3DLayer, XRLayer, ZarrPixelSource, convertInterleavedPhotometricToRgb, expandShaderModule, getChannelStats, getDefaultInitialViewState, getDefaultPalette, getImageSize, isInterleaved, loadMultiTiff, loadOmeTiff, loadOmeZarr, load as loadOmeZarrFromStore, needsPhotometricRgbConversion, padColors, padColorsForUBO };
