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

const configs = {
  build: {
    input: 'src/index.js',
    file: 'dist/index.js',
    format: 'esm',
  },
  testLayers: {
    input: 'tests/layers_views/index.spec.js',
    format: 'cjs'
  },
  testLoaders: {
    input: 'tests/loaders/index.spec.js',
    format: 'cjs'
  }
};

const key = process.env.TEST_LAYERS ? 
  'testLayers' : process.env.TEST_LOADERS ? 
  'testLoaders' : 'build';
const config = configs[key];

export default {
    input: config.input,
    output: {
      file: config.file,
      format: config.format,
    },
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
