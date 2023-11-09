import * as esbuild from "esbuild";

// These are necessary as long as we use `tape` for tests in the browser.
// The package relies on many node-isms and must be adapted.
import { NodeGlobalsPolyfillPlugin as globals } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin as builtins } from '@esbuild-plugins/node-modules-polyfill';

console.log(process.argv[2])

esbuild.build({
  entryPoints: [process.argv[2]],
  bundle: true,
  format: "iife",
  plugins: [
    globals({ process: true, buffer: true }),
    builtins(),
  ],
});
