import { LayerExtension } from '@deck.gl/core';
import { ShaderAssembler } from '@luma.gl/shadertools';
import { VIV_CHANNEL_INDEX_PLACEHOLDER, VIV_PLANE_INDEX_PLACEHOLDER, MAX_COLOR_INTENSITY, DEFAULT_COLOR_OFF, MAX_CHANNELS } from '@vivjs/constants';

const apply_transparent_color = `vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
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
__publicField(_VivShaderAssembler, "_default");
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
__publicField(VivLayerExtension, "extensionName", "VivLayerExtension");

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
const defaultProps$4 = {
  colormap: { type: "string", value: "viridis", compare: true },
  opacity: { type: "number", value: 1, compare: true },
  // we should review use of 'boolean', don't want to change it everywhere if not necessary.
  useTransparentColor: { type: "boolean", value: false, compare: true }
};
const AdditiveColormapExtension = class extends VivLayerExtension {
  // this doesn't need any shader code template manipulation, as long as NUM_CHANNELS is defined
  // we could just use `LayerExtension.getShaders()` as before here
  getVivShaderTemplates() {
    const name = this?.props?.colormap || defaultProps$4.colormap.value;
    const apply_cmap = cmaps[name];
    if (!apply_cmap) {
      throw Error(`No colormap named ${name} found in registry`);
    }
    return { modules: [colormapModuleFactory(name, apply_cmap)] };
  }
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    const name = this?.props?.colormap || defaultProps$4.colormap.value;
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
AdditiveColormapExtension.defaultProps = defaultProps$4;

function padWithDefault(arr, defaultValue, padWidth) {
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
  const paddedColors = padWithDefault(
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
  const paddedColors = padWithDefault(
    newColors,
    /** @type {Color} */
    DEFAULT_COLOR_OFF,
    padSize
  );
  return paddedColors;
}

const moduleName$1 = "colorPaletteModule";
const fs$1 = `uniform ${moduleName$1}Uniforms {
  vec3 transparentColor;
  uint useTransparentColor;
  float opacity;
  vec3 color${VIV_CHANNEL_INDEX_PLACEHOLDER};
} ${moduleName$1};

${apply_transparent_color}

void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName$1}.color${VIV_CHANNEL_INDEX_PLACEHOLDER},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    rgb += max(0.0, min(1.0, intensity[i])) * vec3(colors[i]);
  }
}
vec4 apply_opacity(vec3 rgb) {
  bool useTransparentColor = ${moduleName$1}.useTransparentColor != uint(0);
  return vec4(apply_transparent_color(rgb, ${moduleName$1}.transparentColor, useTransparentColor, ${moduleName$1}.opacity));
}
`;
const DECKGL_MUTATE_COLOR = `vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity);
rgba = apply_opacity(rgb);
`;
const colorPalette = {
  name: moduleName$1,
  uniformTypes: {
    transparentColor: "vec3<f32>",
    useTransparentColor: "u32",
    opacity: "f32",
    [`color${VIV_CHANNEL_INDEX_PLACEHOLDER}`]: "vec3<f32>"
  },
  fs: fs$1,
  inject: {
    "fs:DECKGL_MUTATE_COLOR": DECKGL_MUTATE_COLOR
  }
};

const defaultProps$3 = {
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
      opacity = defaultProps$3.opacity.value,
      transparentColor = defaultProps$3.transparentColor.value,
      useTransparentColor = defaultProps$3.useTransparentColor.value
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
ColorPaletteExtension.defaultProps = defaultProps$3;

const moduleName = "lensModule";
const fs = `uniform ${moduleName}Uniforms {
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
} ${moduleName};

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Check membership in ellipse.
  return pow((${moduleName}.lensCenter.x - vTexCoord.x) / ${moduleName}.majorLensAxis, 2.) + pow((${moduleName}.lensCenter.y - vTexCoord.y) / ${moduleName}.minorLensAxis, 2.) < (1. - ${moduleName}.lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((${moduleName}.lensCenter.x - vTexCoord.x) / ${moduleName}.majorLensAxis, 2.) + pow((${moduleName}.lensCenter.y - vTexCoord.y) / ${moduleName}.minorLensAxis, 2.);

  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - ${moduleName}.lensBorderRadius);
}
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool lensEnabled = ${moduleName}.lensEnabled != uint(0);
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == ${moduleName}.lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float[NUM_CHANNELS] intensity, vec2 vTexCoord) {
  vec3 colors[NUM_CHANNELS] = vec3[NUM_CHANNELS](
    ${moduleName}.color${VIV_CHANNEL_INDEX_PLACEHOLDER},
  );
  for(int i = 0; i < NUM_CHANNELS; i++) {
    float useColorValue = get_use_color_float(vTexCoord, i);
    rgb += max(0., min(1., intensity[i])) * max(vec3(colors[i]), (1. - useColorValue) * vec3(1., 1., 1.));
  }
}
`;
const lens = {
  name: moduleName,
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
  fs,
  inject: {
    "fs:DECKGL_MUTATE_COLOR": `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity, vTexCoord);
   rgba = vec4(rgb, 1.);
  `,
    "fs:#main-end": `
      bool lensEnabled = ${moduleName}.lensEnabled != uint(0);
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
      fragColor = (lensEnabled && isFragOnLensBounds) ? vec4(${moduleName}.lensBorderColor, 1.) : fragColor;
  `
  }
};

const defaultProps$2 = {
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
      const { lensRadius = defaultProps$2.lensRadius.value } = this.props;
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
      lensEnabled = defaultProps$2.lensEnabled.value,
      lensSelection = defaultProps$2.lensSelection.value,
      lensBorderColor = defaultProps$2.lensBorderColor.value,
      lensBorderRadius = defaultProps$2.lensBorderRadius.value,
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
    this.state.model?.shaderInputs.setProps({
      lensModule
    });
  }
  finalizeState() {
    if (this.context.deck) {
      this.context.deck.eventManager.off({
        pointermove: this.state?.onMouseMove,
        pointerleave: this.state?.onMouseMove,
        wheel: this.state?.onMouseMove
      });
    }
  }
};
LensExtension.extensionName = "LensExtension";
LensExtension.defaultProps = defaultProps$2;

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
const defaultProps$1 = {
  colormap: { type: "string", value: "viridis", compare: true }
};
const BaseExtension$1 = class BaseExtension extends VivLayerExtension {
  constructor(...args) {
    super(args);
    this.opts = this.opts || {};
  }
  getVivShaderTemplates() {
    const name = this?.props?.colormap || defaultProps$1.colormap.value;
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
BaseExtension$1.defaultProps = defaultProps$1;

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

const defaultProps = {
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
BaseExtension.defaultProps = defaultProps;

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

export { AdditiveColormap3DExtensions, AdditiveColormapExtension, ColorPalette3DExtensions, ColorPaletteExtension, LensExtension, VivLayerExtension, VivShaderAssembler, expandShaderModule, getDefaultPalette, padColors, padColorsForUBO };
