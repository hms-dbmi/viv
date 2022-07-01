import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';

import * as path from "node:path";
import * as url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
  input: path.resolve(__dirname, "./node_modules/@hms-dbmi/viv/src/index.js"),
  output: {
    file: path.resolve(__dirname, "./dist/index.js"),
    format: "esm",
  },
  plugins: [
    resolve({
      extensions: ['.js', '.ts', '.jsx'],
      resolveOnly: (name) => name.includes("@vivjs"),
    }),
    sucrase({ transforms: ['typescript', 'jsx'] }),
  ]
}

