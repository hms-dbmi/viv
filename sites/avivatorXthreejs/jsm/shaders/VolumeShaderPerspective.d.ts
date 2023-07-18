import {
  Uniform
} from '../../node_modules/three/build/three.module.js';

export const VolumeRenderShaderPerspective: {
  uniforms: {
    u_size: Uniform;
    volumeTex: Uniform;
    volumeTex2: Uniform;
    volumeTex3: Uniform;
    u_renderstyle: Uniform;
    u_renderthreshold: Uniform;
    u_opacity: Uniform;
    u_clim: Uniform;
    u_data: Uniform;
    u_cmdata: Uniform;
    near: Uniform;
    far: Uniform;
    "alphaScale": Uniform,
    "dtScale": Uniform,
    "finalGamma": Uniform,
    "boxSize": Uniform,
    "useVolumeMirrorX": Uniform
  };
  vertexShader: string;
  fragmentShader: string;
};
