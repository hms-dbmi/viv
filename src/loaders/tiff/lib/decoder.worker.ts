import { getDecoder, addDecoder } from 'geotiff';
import LZWDecoder from './lzw-decoder';

addDecoder(5, () => LZWDecoder);

const worker: Worker = self as any;

worker.addEventListener('message', async e => {
  const { id, fileDirectory, buffer } = e.data;
  const decoder = await getDecoder(fileDirectory);
  const decoded = await decoder.decode(fileDirectory, buffer);
  worker.postMessage({ decoded, id }, [decoded]);
});
