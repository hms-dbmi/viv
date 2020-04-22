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
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import replace from '@rollup/plugin-replace';

const pkgObj = require('./package.json');

function getExternals(pkg) {
  const { devDependencies = {}, dependencies = {} } = pkg;
  const externals = Object.keys(devDependencies)
    .concat(Object.keys(dependencies))
    .filter(e => e !== 'geotiff');
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
      exclude: /node_modules(?!\/geotiff)\/.*/,
      babelrc: false,
      presets: [
        ['@babel/env', { loose: true, modules: false }],
        '@babel/preset-react'
      ]
    }),
    glslify({ basedir: 'src/layers/XRLayer' }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    replace({
      delimiters: ['', ''],
      values: {
        "require('readable-stream/transform')": "require('stream').Transform",
        'require("readable-stream/transform")': 'require("stream").Transform',
        'readable-stream': 'stream'
      }
    }),
    webWorkerLoader({
      pattern: /worker-loader!(.+)/
    }),
    // Resolve source maps to the original source
    sourceMaps()
  ]
};
