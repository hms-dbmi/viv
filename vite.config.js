import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

import glslify from 'rollup-plugin-glslify';

const plugins = [ glslify() ];

const configAvivator = defineConfig({
  plugins,
  base: './',
  root: 'avivator',
  publicDir: 'avivator/public',
  resolve: {
    alias: {
      '@hms-dbmi/viv': resolve(__dirname, 'src'),
      'react': resolve(__dirname, 'avivator/node_modules/react'),
      'react-dom': resolve(__dirname, 'avivator/node_modules/react-dom'),
      /**
       * Geottif.js uses node-builtins in its source. We don't use these 
       * module exports in our code. Rather than polyfilling these modules, 
       * we use resolve to empty exports.
       */
      'fs': resolve(__dirname, 'avivator/empty-fs.js'),
      'http': resolve(__dirname, 'avivator/empty-default.js'),
      'https': resolve(__dirname, 'avivator/empty-default.js'),
      'through2': resolve(__dirname, 'avivator/empty-default.js'),
    }
  },
});;

const configViv = defineConfig({
  plugins,
  build: {
    target: 'esnext',
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.peerDependencies),
        ...Object.keys(pkg.dependencies),
      ],
    } 
  },
});

export default ({ command, mode }) => {
  if (command === 'build' && mode === 'lib') {
    return configViv;
  } 
  return configAvivator;
}
