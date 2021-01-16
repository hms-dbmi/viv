/*
* Adds types for imports from `rollup-plugin-web-worker-loader`
*
* import Worker from 'web-worker:./some-url'
* const worker = new Worker();
*/
declare module 'web-worker:*' {
  class WorkerLoader extends Worker {
    constructor() {}
  }
  export default WorkerLoader;
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
