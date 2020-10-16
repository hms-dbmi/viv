/* eslint-disable no-restricted-globals */

import { getTiffDecoder } from './decoder';

async function decode(self, fileDirectory, buffer) {
  const decoder = getTiffDecoder(fileDirectory);
  const result = await decoder.decode(fileDirectory, buffer);
  self.postMessage([result], [result]);
}

if (typeof self !== 'undefined') {
  self.addEventListener('message', event => {
    const [name, ...args] = event.data;
    switch (name) {
      case 'decode':
        decode(self, ...args);
        break;
      default:
        break;
    }
  });
}
