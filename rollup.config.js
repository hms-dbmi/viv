// thank you https://github.com/gzuidhof/zarr.js/blob/master/rollup.config.ts
// for giving me a starting point :)

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from 'rollup-plugin-babel';
import sourceMaps from 'rollup-plugin-sourcemaps';

const pkg = require('./package.json');

const libraryName = '@hubmap/vitessce-image-viewer';

function getExternals(pkg) {
  const { peerDependencies = {} } = pkg;
  console.log(Object.keys(peerDependencies));
  return Object.keys(peerDependencies);
}

export default {
  input: `src/index.js`,
  output: [
    { file: pkg.main, name: libraryName, format: 'umd', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true }
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: getExternals(pkg),
  watch: {
    include: 'src/**'
  },
  plugins: [
    // Allow json resolution
    json(),
    babel({
      exclude: 'node_modules/**',
      presets: ['@babel/env', '@babel/preset-react']
    }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs({
      namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        'node_modules/geotiff/dist/geotiff.bundle.min.js': ['fromUrl', 'Pool']
      }
    }),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    // Resolve source maps to the original source
    sourceMaps()
  ]
};
