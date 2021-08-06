import { defineConfig } from 'vite';
import { resolve } from 'path';

import reactRefresh from '@vitejs/plugin-react-refresh';
import glslify from 'rollup-plugin-glslify';
import esbuild from 'esbuild';

const plugins = [
  reactRefresh(),
  glslify(),
  {
    /**
     * Bundles code in `src/loaders/tiff/lib/decoder.worker.ts` into a single file
     * during _development only_. WebWorker modules are only stable in chromium
     * browsers, so this is a work-around to allow us to develop in other browsers.
     * 
     * see: https://github.com/hms-dbmi/viv/pull/469#issuecomment-877276110
     */
    name: 'bundle-web-worker',
    apply: 'serve', // plugin only applied with dev-server
    async transform(_, id) {
      if (id.includes('decoder.worker.ts?worker_file')) {
        // just use esbuild to bundle the worker dependencies
        const bundle = await esbuild.build({
          entryPoints: [id],
          format: 'esm',
          bundle: true,
          write: false
        });
        if (bundle.outputFiles.length !== 1) {
          throw new Error('Worker must be a single module.');
        }
        return bundle.outputFiles[0].text;
      }
    }
  }
];

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
       * Geotiff.js uses node-builtins in its source. We don't use these
       * module exports in our code. Rather than polyfilling these modules,
       * we use resolve to empty exports.
       */
      'fs': resolve(__dirname, 'avivator/empty-fs.js'),
      './make-node-stream': resolve(__dirname, 'avivator/empty-loaders.gl-iterators-make-node-stream.js'),
    }
  }
});

const configViv = defineConfig({
  plugins,
  build: {
    target: 'esnext',
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['es']
    },
    rollupOptions: {
      // All non-relative paths are external
      external: [/^[^.\/]|^\.[^.\/]|^\.\.[^\/]/],
    }
  }
});

export default ({ command, mode }) => {
  if (command === 'build' && mode === 'lib') {
    return configViv;
  }
  return configAvivator;
};
