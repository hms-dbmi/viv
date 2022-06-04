import * as esbuild from "esbuild";
import { glslify } from "esbuild-plugin-glslify";

esbuild.build({
  entryPoints: [process.argv[2]],
  outfile: './dist/index.js',
  bundle: true,
  format: "esm",
  plugins: [
    glslify(),
    {
      name: "make-all-packages-external",
      setup(build) {
        build.onResolve({ filter: /^[^\.]/ }, ({ path }) => {
          return { path, external: true };
        });
      },
    },
  ],
})
