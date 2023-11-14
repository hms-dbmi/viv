import { getDecoder, addDecoder } from 'geotiff';
import LZWDecoder from './lzw-decoder';

addDecoder(5, () => LZWDecoder);

// @ts-expect-error - We are in a worker context
const worker: ServiceWorker = self;

worker.addEventListener('message', async e => {
  // @ts-expect-error - FIXME: we should have strict types
  const { id, fileDirectory, buffer } = e.data;
  const decoder = await getDecoder(fileDirectory);
  const decoded = await decoder.decode(fileDirectory, buffer);
  worker.postMessage({ decoded, id }, [decoded]);
});
