declare module 'quickselect' {
  function quickselect<T>(
    arr: ArrayLike<T>,
    k?: number,
    left?: number,
    right?: number,
    compareFn?: (a: T, b: T) => void
  ) {}
  export default quickselect;
}

/*
 * Adds types for imports for vite
 *
 * import Worker from './my-worker.ts?worker&inline'
 * const worker = new Worker();
 */
declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

/*
 * Adds types for files imported by 'rollup-plugin-glslify'
 *
 * import fs from 'my-shader.glsl';
 * (typeof fs === string) === true
 */
declare module '**/*.glsl' {
  const value: string;
  export default string;
}
