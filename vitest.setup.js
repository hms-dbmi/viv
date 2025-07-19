import { beforeAll } from 'vitest';
/*
import { JSDOM } from 'jsdom';

const jsdom = new JSDOM(``, { pretendToBeVisual: true });


const { DOMParser, requestAnimationFrame, document } = jsdom.window;

beforeAll(() => {
  // Set up a global DOMParser for tests that require it.
  global.DOMParser = DOMParser;
  global.requestAnimationFrame = requestAnimationFrame;
  global.document = document;
});

*/

import 'vitest-canvas-mock';

// Node does not support Promise.withResolvers yet.
// Reference: https://github.com/vitest-dev/vitest/discussions/5512#discussioncomment-9054811
Promise.withResolvers = () => {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res, reject = rej })
  return { promise, resolve, reject }
};