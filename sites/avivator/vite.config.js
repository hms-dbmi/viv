import { defineConfig } from 'vite';
import serveStatic from 'serve-static';
import react from '@vitejs/plugin-react';

import * as path from 'path';

/**
 * Vite plugins. Serves contents of `avivator/data` during
 * development.
 * @param {string} dir
 * @returns {import('vite').Plugin}
 */
const serveData = dir => {
  if (dir[0] === '~') {
    dir = path.join(process.env.HOME, dir.slice(1));
  } else {
    dir = path.resolve(__dirname, dir);
  }
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
    }
  };
};

export default defineConfig({
  plugins: [react(), serveData(process.env.VIV_DATA_DIR || 'avivator/data')]
});
