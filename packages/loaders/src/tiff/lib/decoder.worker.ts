import { addDecoder, getDecoder } from 'geotiff';

import LZWDecoder from './lzw-decoder';

addDecoder(5, () => Promise.resolve(LZWDecoder));

// @ts-expect-error - We are in a worker context
const worker: ServiceWorker = self;

worker.addEventListener('message', async e => {
  // @ts-expect-error - MessageEvent data shape from main thread
  const { jobId, fileDirectory, buffer } = e.data;
  try {
    const decoder = await getDecoder(fileDirectory);
    const decoded = await decoder.decode(fileDirectory, buffer);
    worker.postMessage({ decoded, jobId }, [decoded]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    worker.postMessage({ jobId, error: message });
  }
});
