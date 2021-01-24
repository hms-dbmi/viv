import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sucrase from '@rollup/plugin-sucrase';

import workerLoader from 'rollup-plugin-web-worker-loader';
import glslify from 'rollup-plugin-glslify';

import pkg from './package.json';

const getConfig = test => {
  // Our test runners are commonjs-based or require cjs (browserify + tape-run).
  if (test) {
    return {
      input: `tests/${test}/index.spec.js`,
      output: { format: 'cjs' },
    };
  }

  // Library build is a modern ESM target intended to be injested by a bundler.
  return {
    input: 'src/index.js',
    output: { file: 'dist/index.js', format: 'esm' },
  };
};

const config = getConfig(process.env.TEST);
export default {
  input: config.input,
  output: config.output,
  external: [
    ...['fs/promises', 'path'], // for testing
    ...Object.keys(pkg.peerDependencies),
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
  ],
  plugins: [
    /*
     *  Required only because the 'rollup-plugin-web-worker-loader" inlines
     *  code from "geotiff/src/compression". Geotiff uses an older version
     *  of pako that doesn't have an esm export. We need a plugin to transform
     *  to esm, and here we are explicit that it's just pako.
     */
    resolve({ include: 'node_modules/geotiff' }),
    commonjs({ include: 'node_modules/pako/**/*.js' }),

    // import fs from './shader.glsl' --> const fs = "<compiled-shader>"
    glslify(),

    // Inlines JS source for a Web-Worker as a base64-encoded string.
    workerLoader({ targetPlatform: 'browser', inline: true }),

    // Compiles TS (also transpiles JS source and applies JSX transforms)
    sucrase({
      transforms: ['jsx', 'typescript'],
      production: true,
    })

  ]
};
