import * as esbuild from "esbuild";
import { glslify } from "esbuild-plugin-glslify";

// These are necessary as long as we use `tape` for tests in the browser.
// The package relies on many node-isms and must be adapted.
import { NodeGlobalsPolyfillPlugin as globals } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin as builtins } from '@esbuild-plugins/node-modules-polyfill';

esbuild.build({
  entryPoints: [process.argv[2]],
  bundle: true,
  format: "iife",
  plugins: [
    globals({ process: true, buffer: true }),
    builtins(),
    glslify(),
  ],
});
