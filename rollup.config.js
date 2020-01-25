import commonjs from "@rollup/plugin-commonjs";
import external from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import babel from 'rollup-plugin-babel';

import pkg from "./package.json";

export default {
  input: "src/index.js",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      exports: "named",
      sourcemap: true
    },
    {
      file: pkg.module,
      format: "es",
      exports: "named",
      sourcemap: true
    }
  ],
  plugins: [
    external(),
    resolve(),
    babel({
         exclude: 'node_modules/**'
    }),
    commonjs({
      include: ["node_modules/**"],
      exclude: ["**/*.stories.js"],
      namedExports: {
        "node_modules/react/react.js": [
          "Children",
          "Component",
          "PropTypes",
          "createElement"
        ],
        "node_modules/react-dom/index.js": ["render"],
        "node_modules/@loaders.gl/loader-utils/dist/esm/lib/library-utils/require-utils.node.js": ["requireFromFile"],
        "node_modules/probe.gl/env.js": ["global", "isBrowser", "getBrowser"],
        "node_modules/s2-geometry/src/s2geometry.js" : ["S2"]
      }
    })
  ]
};
