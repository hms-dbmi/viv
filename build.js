// const esbuild = require('esbuild');
// const { glslify } = require('esbuild-plugin-glslify');
import esbuild from 'esbuild';
import { glslify } from 'esbuild-plugin-glslify';

esbuild.build({
  entryPoints: ['tests/loaders/index.spec.js'],
  format: 'cjs',
  bundle: true,
  // banner: {
  //   js: `
  //   const require = (x) => {
  //     if (x === 'stream') return class A {
  //       on() {};
  //     }
  //     return x;
  //   };
  //   const global = globalThis;
  //   const process = {
  //     browser: true,
  //     nextTick: () => {},
  //   };
  // `
  // },
  plugins: [
    {
      name: 'make-all-packages-external',
      setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
      },
    },
    glslify(),
  ],
});
