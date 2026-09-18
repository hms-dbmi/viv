import { addDecoder, getDecoder } from 'geotiff';
import { L as LZWDecoder } from '../../shared/loaders.9634c5c9.mjs';
import 'lzw-tiff-decoder';

addDecoder(5, () => Promise.resolve(LZWDecoder));
const worker = self;
worker.addEventListener("message", async (e) => {
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
