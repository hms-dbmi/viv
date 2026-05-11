import {
  VIV_CHANNEL_INDEX_PLACEHOLDER as I,
  VIV_PLANE_INDEX_PLACEHOLDER as P
} from '@vivjs/constants';

const moduleName = 'fragmentUniforms3D';

const fs = `\
uniform ${moduleName}Uniforms {
  vec2 xSlice;
  vec2 ySlice;
  vec2 zSlice;
  mat4 scale;
  vec3 color${I};
  vec3 normal${P};
  float distance${P};
} ${moduleName};
`;

export default {
  name: moduleName,
  uniformTypes: {
    xSlice: 'vec2<f32>',
    ySlice: 'vec2<f32>',
    zSlice: 'vec2<f32>',
    scale: 'mat4x4<f32>',
    [`color${I}`]: 'vec3<f32>',
    [`normal${P}`]: 'vec3<f32>',
    [`distance${P}`]: 'f32'
  },
  fs
};
