import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import glslify from 'rollup-plugin-glslify';
import pkg from './package.json';

export default {
  output: {
    format: 'cjs',
  },
  external: [
    ...['fs/promises', 'path'],
    ...Object.keys(pkg.peerDependencies),
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
  ],
  plugins: [
    resolve(),
    glslify(),
    sucrase({ transforms: ['jsx', 'typescript'] }),
  ]
};
