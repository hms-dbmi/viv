// thank you https://github.com/gzuidhof/zarr.js/blob/master/rollup.config.ts
// for giving me a starting point :)

// We run linting on all files so this one is checked too.
/* eslint-disable import/no-extraneous-dependencies */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from 'rollup-plugin-babel';
import sourceMaps from 'rollup-plugin-sourcemaps';
import glslify from 'rollup-plugin-glslify';

const pkgObj = require('./package.json');

function getExternals(pkg) {
  const { devDependencies = {}, dependencies = {} } = pkg;
  const externals = Object.keys(devDependencies)
    .concat(Object.keys(dependencies))
    .filter(p => p !== 'geotiff');
  // We only bundle geotiff because of threads.js
  return externals;
}

export default {
  input: 'src/index.js',
  output: [
    { file: pkgObj.main, name: 'viv', format: 'umd', sourcemap: true },
    { file: pkgObj.module, format: 'es', sourcemap: true }
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: getExternals(pkgObj),
  watch: {
    include: 'src/**'
  },
  plugins: [
    // Allow json resolution
    json(),
    babel({
      exclude: 'node_modules/**',
      presets: ['@babel/env', '@babel/preset-react'],
      runtimeHelpers: true
    }),
    glslify({ basedir: 'src/layers/XRLayer' }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    // Resolve source maps to the original source
    sourceMaps()
  ]
};
