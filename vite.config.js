import { defineConfig } from 'vite';
import { join, resolve } from 'path';
import serveStatic from 'serve-static';

import react from '@vitejs/plugin-react';
import glslify from 'rollup-plugin-glslify';
import esbuild from 'esbuild';

const resolveDataDir = (fp) => {
  if (fp[0] === '~') {
    return join(process.env.HOME, fp.slice(1));
  }
  return resolve(__dirname, fp);
};

/**
 * Vite plugins. Serves contents of `avivator/data` during
 * development.
 *
 * @returns {import('vite').Plugin}
 */
const serveData = (dir) => {
  dir = resolveDataDir(dir);
  const serve = serveStatic(dir);
  return {
    name: 'serve-data-dir',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/@data\//.test(req.url)) {
          req.url = req.url.replace('/@data/', '');
          serve(req, res, next);
        } else {
          next();
        }
      });
    },
  };
};

/**
 * Vite plugin. Bundles code in `src/loaders/tiff/lib/decoder.worker.ts`
 * into a single file during _development only_. WebWorker modules are only
 * stable in chromium browsers, so this is a work-around to allow us to
 * develop in other browsers.
 *
 * see: https://github.com/hms-dbmi/viv/pull/469#issuecomment-877276110
 *
 * @returns {import('vite').Plugin}
 */
const bundleWebWorker = () => {
  return {
    name: 'bundle-web-worker',
    apply: 'serve', // plugin only applied with dev-server
    async transform(_, id) {
      if (/\?worker_file$/.test(id)) {
        // just use esbuild to bundle the worker dependencies
        const bundle = await esbuild.build({
          entryPoints: [id],
          format: 'esm',
          bundle: true,
          write: false,
        });
        if (bundle.outputFiles.length !== 1) {
          throw new Error('Worker must be a single module.');
        }
        return bundle.outputFiles[0].text;
      }
    },
  };
};

const plugins = [
  glslify(),
  bundleWebWorker(),
  serveData(process.env.VIV_DATA_DIR || 'avivator/data'),
];

const configAvivator = defineConfig({
  plugins: [react(), ...plugins],
  base: './',
  root: 'avivator',
  publicDir: 'avivator/public',
  resolve: {
    alias: {
      '@hms-dbmi/viv': resolve(__dirname, 'src'),
      'react': resolve(__dirname, 'avivator/node_modules/react'),
      'react-dom': resolve(__dirname, 'avivator/node_modules/react-dom'),
    },
  },
});

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
      // All non-relative paths are external
      external: [/^[^.\/]|^\.[^.\/]|^\.\.[^\/]/],
    },
  },
});

export default ({ command, mode }) => {
  if (command === 'build' && mode === 'lib') {
    return configViv;
  }
  return configAvivator;
};
