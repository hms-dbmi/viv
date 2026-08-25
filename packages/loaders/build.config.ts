import { defineBuildConfig } from 'unbuild';

/**
 * Second entry emits `dist/decoder.worker.mjs` beside `index.mjs` so
 * `new URL('./decoder.worker.mjs', import.meta.url)` resolves when the package is consumed.
 */
export default defineBuildConfig({
  entries: ['./src/index', './src/tiff/lib/decoder.worker'],
  declaration: true
});
