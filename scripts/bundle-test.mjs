import * as esbuild from "esbuild";
import { glslify } from "esbuild-plugin-glslify";

import * as path from "node:path";
import * as url from "node:url";

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));

esbuild.build({
  entryPoints: [process.argv[2]],
  bundle: true,
  format: "iife",
  tsconfig: path.resolve(__dirname, "../tsconfig.json"),
  plugins: [glslify()],
});
