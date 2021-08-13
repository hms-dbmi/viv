import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import glslify from 'rollup-plugin-glslify';

export default {
  output: {
    format: 'cjs'
  },
  // All non-relative paths are external
  external: [/^[^.\/]|^\.[^.\/]|^\.\.[^\/]/],
  plugins: [
    resolve(),
    glslify(),
    sucrase({ transforms: ['jsx', 'typescript'] })
  ]
};
