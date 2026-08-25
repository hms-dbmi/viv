import { getDecoder } from 'geotiff';

/**
 * Structural type compatible with `GeoTIFFImage.readRasters({ pool })`.
 *
 * @see https://github.com/geotiffjs/geotiff.js/blob/master/src/pool.js
 */
export type DecodePool = {
  decode: (fileDirectory: unknown, buffer: ArrayBuffer) => Promise<ArrayBuffer>;
  destroy?: () => void | Promise<void>;
};

const defaultPoolSize = globalThis?.navigator?.hardwareConcurrency ?? 4;

function defaultCreateWorker(): Worker {
  return new Worker(new URL('./tiff/lib/decoder.worker.mjs', import.meta.url), {
    type: 'module'
  });
}

/**
 * Same job protocol as geotiff.js Pool (`submitJob` / `jobId`); not a subclass of
 * geotiff's Pool so we always dispatch to workers when `size > 0` (avoids
 * preferWorker skipping workers for raw/uncompressed).
 *
 * @see https://github.com/geotiffjs/geotiff.js/blob/master/src/pool.js
 */
class WorkerWrapper {
  worker: Worker;
  private jobIdCounter = 0;
  private jobs = new Map<
    number,
    {
      resolve: (v: { decoded: ArrayBuffer }) => void;
      reject: (e: unknown) => void;
    }
  >();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener('message', e => this.onWorkerMessage(e));
  }

  getJobCount() {
    return this.jobs.size;
  }

  private onWorkerMessage(e: MessageEvent) {
    const { jobId, error, ...result } = e.data as {
      jobId: number;
      error?: string;
      decoded?: ArrayBuffer;
    };
    const job = this.jobs.get(jobId);
    this.jobs.delete(jobId);
    if (!job) return;

    if (error) job.reject(new Error(error));
    else job.resolve(result as { decoded: ArrayBuffer });
  }

  submitJob(message: object, transferables: Transferable[] = []) {
    const jobId = this.jobIdCounter++;
    const promise = new Promise<{ decoded: ArrayBuffer }>((resolve, reject) => {
      this.jobs.set(jobId, { resolve, reject });
    });
    this.worker.postMessage({ ...message, jobId }, transferables);
    return promise;
  }

  terminate() {
    this.worker.terminate();
  }
}

/**
 * Decoder pool for geotiff.js: same surface as geotiff's default Pool (`decode` /
 * `destroy`) but always sends work to decoder workers when `size > 0`.
 */
export class Pool implements DecodePool {
  private workerWrappers: Promise<WorkerWrapper[]> | null = null;

  constructor(
    size: number = defaultPoolSize,
    createWorker: () => Worker = defaultCreateWorker
  ) {
    if (size) {
      this.workerWrappers = (async () => {
        const wrappers: WorkerWrapper[] = [];
        for (let i = 0; i < size; i++) {
          wrappers.push(new WorkerWrapper(createWorker()));
        }
        return wrappers;
      })();
    }
  }

  async decode(
    fileDirectory: unknown,
    buffer: ArrayBuffer
  ): Promise<ArrayBuffer> {
    if (this.workerWrappers) {
      const workerWrapper = (await this.workerWrappers).reduce((a, b) =>
        a.getJobCount() < b.getJobCount() ? a : b
      );
      const { decoded } = await workerWrapper.submitJob(
        { fileDirectory, buffer },
        [buffer]
      );
      return decoded;
    }

    const decoder = await getDecoder(fileDirectory as { Compression: number });
    return decoder.decode(fileDirectory, buffer);
  }

  async destroy() {
    if (!this.workerWrappers) return;
    const wrappers = await this.workerWrappers;
    this.workerWrappers = null;
    for (const w of wrappers) {
      w.terminate();
    }
  }
}
