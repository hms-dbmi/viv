import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sucrase from '@rollup/plugin-sucrase';

import workerLoader from 'rollup-plugin-web-worker-loader';
import glslify from 'rollup-plugin-glslify';

import pkg from './package.json';
const external = [
  ...Object.keys(pkg.peerDependencies),
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
];

const config = (test) => {
  if (!test) {
    return {
      input: 'src/index.js',
      output: { file: 'dist/index.js', format: 'esm' }
    }
  }
  return {
    input: `tests/${test}/index.spec.js`,
    output: { format: 'cjs' }
  }
}

export default {
  ...config(process.env.TEST),
  external,
  plugins: [
    resolve(),
    glslify(),
    workerLoader({
      targetPlatform: 'browser',
      inline: true,
    }),
    sucrase({
      exclude: "node_modules/*",
      transforms: ['jsx'],
      production: true,
    }),
    commonjs(),
  ]
}
