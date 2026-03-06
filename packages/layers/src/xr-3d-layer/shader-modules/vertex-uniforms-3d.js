const moduleName = 'vertex';

// This module just declares the uniformTypes for the vertex shader UBO
// The actual GLSL UBO block is defined directly in xr-3d-layer-vertex.glsl.js

export default {
  name: moduleName,
  uniformTypes: {
    eye_pos: 'vec3<f32>',
    proj: 'mat4x4<f32>',
    model: 'mat4x4<f32>',
    view: 'mat4x4<f32>',
    scale: 'mat4x4<f32>',
    resolution: 'mat4x4<f32>'
  }
};
