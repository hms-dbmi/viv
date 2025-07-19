import { defineConfig } from "vitest/config";
import { resolve } from 'path';

export default defineConfig({
  test: {
    setupFiles: [resolve(__dirname, './vitest.setup.js')],
    globals: true,
    environment: "jsdom",
    deps: {
      optimizer: {
        web: {
          include: ['vitest-canvas-mock'],
        }
      }
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },

});