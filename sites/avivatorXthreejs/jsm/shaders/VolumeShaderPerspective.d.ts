import {
  Uniform
} from '../../node_modules/three/build/three.module.js';

export const VolumeRenderShaderPerspective: {
  uniforms: {
    u_size: Uniform;
    volumeTex: Uniform;
    volumeTex2: Uniform;
    volumeTex3: Uniform;
    volumeTex4: Uniform;
    volumeTex5: Uniform;
    volumeTex6: Uniform;
    u_renderstyle: Uniform;
    u_renderthreshold: Uniform;
    u_opacity: Uniform;
    u_clim: Uniform;
    u_clim2: Uniform;
    u_clim3: Uniform;
    u_clim4: Uniform;
    u_clim5: Uniform;
    u_clim6: Uniform;
    u_data: Uniform;
    u_color: Uniform;
    u_color2: Uniform;
    u_color3: Uniform;
    u_color4: Uniform;
    u_color5: Uniform;
    u_color6: Uniform;
    u_cmdata: Uniform;
    near: Uniform;
    far: Uniform;
    "alphaScale": Uniform,
    "dtScale": Uniform,
    "volumeCount": Uniform,
    "finalGamma": Uniform,
    "boxSize": Uniform,
    "useVolumeMirrorX": Uniform
  };
  vertexShader: string;
  fragmentShader: string;
};
