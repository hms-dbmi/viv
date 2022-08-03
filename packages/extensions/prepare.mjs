import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';

// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html#8-colors
const YELLOW = '\u001b[33m';
const GREEN = '\u001b[32m';
const RESET = '\u001b[0m';

const __dirname = url.fileURLToPath(path.dirname(import.meta.url));

const outfile = path.resolve(__dirname, 'src', 'generated-colormaps.js');
const fh = await fsp.open(outfile, 'w');
await fh.write(`\
// The contents of this file are automatically written by
// \`packages/extensions/prepare.mjs\`. Do not modify directly.
`);

// Gather `glsl-colormap` files which follow the `<name>.glsl` pattern
const dir = path.resolve(__dirname, 'node_modules', 'glsl-colormap');
const files = (await fsp.readdir(dir)).filter(fname => fname.endsWith('.glsl'));

console.log(`Writing each ${YELLOW}\`glsl-colormap\`${RESET} to ${outfile}\n`);

for (const file of files) {
  let contents = await fsp.readFile(path.resolve(dir, file), {
    encoding: 'utf-8'
  });
  // find colormap name
  const name = contents.match(/^vec4 (.*) \(.*\{$/m)[1];
  const impl = contents
    .replace(`vec4 ${name}`, `vec4 apply_cmap`) // replace colormap fn name
    .replace(/^#pragma glslify.*\n/gm, ''); // strip off glslify export

  await fh.write(`export const ${name} = \`\\\n${impl}\`;\n`);
  console.log(` - ${name} ${GREEN}✔${RESET}`);
}
