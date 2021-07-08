import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

import glslify from 'rollup-plugin-glslify';

/**
 * Geottif.js uses node-builtins in its source. We don't 
 * use these module exports in our source code. Rather than
 * polyfilling these modules, we use resolve to empty exports.
 */
const geotiffAliases = {
  'fs': resolve(__dirname, 'avivator/empty-fs.js'),
  'http': resolve(__dirname, 'avivator/empty-default.js'),
  'https': resolve(__dirname, 'avivator/empty-default.js'),
  'through2': resolve(__dirname, 'avivator/empty-default.js'),
};

export default ({ command, mode }) => {

  if (command === 'build' && mode === 'lib') {
    return defineConfig({
      plugins: [glslify()],
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
  }
  
  return defineConfig({
    base: './',
    root: 'avivator',
    publicDir: 'avivator/public',
    plugins: [glslify()],
    resolve: {
      alias: {
        '@hms-dbmi/viv': resolve(__dirname, 'src'),
        ...geotiffAliases,
      }
    },
  });   
}
