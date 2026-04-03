export interface ScannerOptions {
  initialWindowSize?: number;
  maxWindowSize?: number;
  mode?: 'fixed' | 'adaptive';
}

const SCANNER_DEFAULTS: Required<ScannerOptions> = {
  initialWindowSize: 64 * 1024,
  maxWindowSize: 1024 * 1024,
  mode: 'adaptive'
};

function validateScannerOptions(opts: Required<ScannerOptions>) {
  if (opts.initialWindowSize <= 0) {
    throw new Error(
      `initialWindowSize must be positive, got ${opts.initialWindowSize}`
    );
  }
  if (opts.maxWindowSize <= 0) {
    throw new Error(
      `maxWindowSize must be positive, got ${opts.maxWindowSize}`
    );
  }
  if (opts.initialWindowSize > opts.maxWindowSize) {
    throw new Error(
      `initialWindowSize (${opts.initialWindowSize}) must not exceed maxWindowSize (${opts.maxWindowSize})`
    );
  }
}

const LITTLE_ENDIAN = 0x4949;
const BIG_ENDIAN = 0x4d4d;
const CLASSIC_MAGIC = 42;
const BIGTIFF_MAGIC = 43;

interface TiffFormat {
  littleEndian: boolean;
  bigTiff: boolean;
  firstIfdOffset: number;
}

function parseTiffHeader(buf: ArrayBuffer): TiffFormat {
  const view = new DataView(buf);
  const bom = view.getUint16(0, false);
  let littleEndian: boolean;
  if (bom === LITTLE_ENDIAN) {
    littleEndian = true;
  } else if (bom === BIG_ENDIAN) {
    littleEndian = false;
  } else {
    throw new Error(`Invalid TIFF byte-order mark: 0x${bom.toString(16)}`);
  }

  const magic = view.getUint16(2, littleEndian);
  if (magic === CLASSIC_MAGIC) {
    const firstIfdOffset = view.getUint32(4, littleEndian);
    return { littleEndian, bigTiff: false, firstIfdOffset };
  }
  if (magic === BIGTIFF_MAGIC) {
    const firstIfdOffset = readUint64(view, 8, littleEndian);
    return { littleEndian, bigTiff: true, firstIfdOffset };
  }
  throw new Error(`Invalid TIFF magic number: ${magic}`);
}

function readUint64(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number {
  const lo = view.getUint32(offset, littleEndian);
  const hi = view.getUint32(offset + 4, littleEndian);
  const value = littleEndian ? hi * 0x100000000 + lo : lo * 0x100000000 + hi;
  if (!Number.isSafeInteger(value)) {
    throw new Error(`IFD offset exceeds safe integer range: ${value}`);
  }
  return value;
}

function computeRequiredIfdSize(
  buf: ArrayBuffer,
  localOffset: number,
  format: TiffFormat
): number | null {
  const view = new DataView(buf);
  const { littleEndian, bigTiff } = format;

  if (bigTiff) {
    if (localOffset + 8 > buf.byteLength) return null;
    const entryCount = readUint64(view, localOffset, littleEndian);
    return 8 + entryCount * 20 + 8;
  }

  if (localOffset + 2 > buf.byteLength) return null;
  const entryCount = view.getUint16(localOffset, littleEndian);
  return 2 + entryCount * 12 + 4;
}

function parseIfd(
  buf: ArrayBuffer,
  localOffset: number,
  format: TiffFormat
): { nextIfdOffset: number; bytesConsumed: number } | null {
  const view = new DataView(buf);
  const { littleEndian, bigTiff } = format;

  if (bigTiff) {
    if (localOffset + 8 > buf.byteLength) return null;
    const entryCount = readUint64(view, localOffset, littleEndian);
    const ifdSize = 8 + entryCount * 20 + 8;
    if (localOffset + ifdSize > buf.byteLength) return null;
    const nextIfdOffset = readUint64(
      view,
      localOffset + 8 + entryCount * 20,
      littleEndian
    );
    return { nextIfdOffset, bytesConsumed: ifdSize };
  }

  if (localOffset + 2 > buf.byteLength) return null;
  const entryCount = view.getUint16(localOffset, littleEndian);
  const ifdSize = 2 + entryCount * 12 + 4;
  if (localOffset + ifdSize > buf.byteLength) return null;
  const nextIfdOffset = view.getUint32(
    localOffset + 2 + entryCount * 12,
    littleEndian
  );
  return { nextIfdOffset, bytesConsumed: ifdSize };
}

function normalizeHeaders(
  headers?: HeadersInit
): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  return headers as Record<string, string>;
}

async function fetchRange(
  url: string,
  start: number,
  end: number,
  headers?: HeadersInit
): Promise<{ buffer: ArrayBuffer; fullFile: boolean }> {
  const resp = await fetch(url, {
    headers: {
      ...normalizeHeaders(headers),
      Range: `bytes=${start}-${end - 1}`
    }
  });
  if (resp.status === 206) {
    return { buffer: await resp.arrayBuffer(), fullFile: false };
  }
  if (resp.ok) {
    return { buffer: await resp.arrayBuffer(), fullFile: true };
  }
  throw new Error(
    `HTTP ${resp.status} fetching range bytes=${start}-${end - 1}`
  );
}

async function fetchOffsetsJson(
  url: string,
  headers?: HeadersInit
): Promise<number[] | null> {
  try {
    const offsetsUrl = `${url}.offsets.json`;
    const resp = await fetch(offsetsUrl, {
      headers: normalizeHeaders(headers)
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    for (const n of data) {
      if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) {
        return null;
      }
    }
    return data;
  } catch {
    return null;
  }
}

async function scanIfdOffsets(
  url: string,
  headers?: HeadersInit,
  options?: ScannerOptions
): Promise<number[]> {
  const opts = { ...SCANNER_DEFAULTS, ...options };
  validateScannerOptions(opts);
  const initialWindow = opts.initialWindowSize;

  const headerResult = await fetchRange(url, 0, 16, headers);
  const format = parseTiffHeader(headerResult.buffer);

  const offsets: number[] = [];
  let currentOffset = format.firstIfdOffset;
  if (currentOffset === 0) return offsets;

  let bufStart: number;
  let buf: ArrayBuffer;
  let haveFullFile: boolean;

  if (headerResult.fullFile) {
    buf = headerResult.buffer;
    bufStart = 0;
    haveFullFile = true;
  } else {
    buf = new ArrayBuffer(0);
    bufStart = -1;
    haveFullFile = false;
  }

  while (currentOffset !== 0) {
    offsets.push(currentOffset);

    const localOffset = currentOffset - bufStart;
    if (!haveFullFile && (bufStart < 0 || localOffset < 0 || localOffset >= buf.byteLength)) {
      const result = await fetchRange(
        url,
        currentOffset,
        currentOffset + initialWindow,
        headers
      );
      buf = result.buffer;
      bufStart = currentOffset;
      if (result.fullFile) {
        bufStart = 0;
        haveFullFile = true;
      }
    }

    const parsed = parseIfd(buf, currentOffset - bufStart, format);
    if (parsed !== null) {
      currentOffset = parsed.nextIfdOffset;
      continue;
    }

    const requiredSize = computeRequiredIfdSize(
      buf,
      currentOffset - bufStart,
      format
    );

    if (haveFullFile) {
      throw new Error(
        `IFD at offset ${currentOffset} extends beyond end of file`
      );
    }

    if (opts.mode === 'fixed') {
      throw new Error(
        `IFD at offset ${currentOffset} requires ${requiredSize ?? '> entry-count header'} bytes, ` +
        `exceeds fixed window of ${initialWindow} bytes`
      );
    }

    const neededBytes = requiredSize ?? initialWindow * 2;
    const retrySize = Math.min(
      Math.max(neededBytes, initialWindow * 2),
      opts.maxWindowSize
    );

    if (requiredSize !== null && retrySize < requiredSize) {
      throw new Error(
        `IFD at offset ${currentOffset} requires ${requiredSize} bytes, ` +
        `exceeds maxWindowSize of ${opts.maxWindowSize} bytes`
      );
    }

    const retryResult = await fetchRange(
      url,
      currentOffset,
      currentOffset + retrySize,
      headers
    );
    buf = retryResult.buffer;
    bufStart = currentOffset;
    if (retryResult.fullFile) {
      bufStart = 0;
      haveFullFile = true;
    }

    const retry = parseIfd(buf, currentOffset - bufStart, format);
    if (retry === null) {
      const exactSize = computeRequiredIfdSize(
        buf,
        currentOffset - bufStart,
        format
      );
      throw new Error(
        `IFD at offset ${currentOffset} could not be parsed after retry ` +
        `(required=${exactSize ?? 'unknown'} bytes, fetched=${retrySize}, max=${opts.maxWindowSize})`
      );
    }
    currentOffset = retry.nextIfdOffset;
  }

  return offsets;
}

/**
 * Resolve IFD offsets for a remote TIFF. Tries `<url>.offsets.json` first,
 * falls back to scanning IFDs from the file directly via range requests.
 */
export async function resolveRemoteOffsets(
  url: string,
  headers?: HeadersInit,
  scannerOptions?: ScannerOptions
): Promise<number[]> {
  const jsonOffsets = await fetchOffsetsJson(url, headers);
  if (jsonOffsets) return jsonOffsets;
  return scanIfdOffsets(url, headers, scannerOptions);
}
