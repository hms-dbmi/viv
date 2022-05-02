import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import glslify from 'rollup-plugin-glslify';

export default {
  output: {
    format: 'cjs',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({ resolveOnly: ['geotiff'] }),
    glslify(),
    sucrase({ transforms: ['jsx', 'typescript'] })
  ]
};
