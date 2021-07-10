import { build } from 'esbuild';
import { glslify } from 'esbuild-plugin-glslify';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

const entry = process.argv[2];
const target = process.env.TARGET?.toLowerCase() || 'node';

const PluginAllExternal = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }));
  },
};

const nodeConfig = {
  format: 'cjs',
  plugins: [
    PluginAllExternal,
    glslify(),
  ]
};

const browserConfig = {
  format: 'iife',
  banner: {
    js: `
    const global = globalThis;
    const __dirname = undefined;
    `
  },
  plugins: [
    NodeGlobalsPolyfillPlugin(),
    NodeModulesPolyfillPlugin(),
    glslify(),
  ]
}

const config = target === 'node' ? nodeConfig : browserConfig;
build({ entryPoints: [entry], bundle: true, target: 'es6', ...config });
