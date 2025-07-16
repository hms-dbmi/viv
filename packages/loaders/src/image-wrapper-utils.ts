// Reference: https://github.com/vitessce/vitessce/blob/213939a1d74860583fd7e0bb615cd06bb9871160/packages/utils/spatial-utils/src/spatial.js#L1
import { assert } from './utils';

/**
 * Get a representative PixelSource from a loader object returned from
 * the Vitessce imaging loaders
 * @param {object} loader { data: (PixelSource[]|PixelSource), metadata, channels } object
 * @param {number | undefined} level Level of the multiscale loader from which to get a PixelSource
 * @returns {object} PixelSource object
 */
export function getSourceFromLoader(loader, level) {
  const { data } = loader;
  const source = Array.isArray(data) ? data[(level || data.length - 1)] : data;
  return source;
}

export const getStatsForResolution = (loader, resolution) => {
  const { shape, labels } = loader[resolution];
  const height = shape[labels.indexOf('y')];
  const width = shape[labels.indexOf('x')];
  const depth = shape[labels.indexOf('z')];
  // eslint-disable-next-line no-bitwise
  const depthDownsampled = Math.max(1, depth >> resolution);
  // Check memory allocation limits for Float32Array (used in XR3DLayer for rendering)
  const totalBytes = 4 * height * width * depthDownsampled;
  return {
    height, width, depthDownsampled, totalBytes,
  };
};

export const canLoadResolution = (loader, resolution) => {
  const {
    totalBytes, height, width, depthDownsampled,
  } = getStatsForResolution(
    loader,
    resolution,
  );
  const maxHeapSize = window.performance?.memory
    && window.performance?.memory?.jsHeapSizeLimit / 2;
  const maxSize = maxHeapSize || (2 ** 31) - 1;
  // 2048 is a normal texture size limit although some browsers go larger.
  return (
    totalBytes < maxSize
    && height <= 2048
    && depthDownsampled <= 2048
    && width <= 2048
    && depthDownsampled > 1
  );
};

/**
 * @param {Array.<number>} shape loader shape
 */
export function isInterleaved(shape: number[]) {
  const lastDimSize = shape[shape.length - 1];
  return lastDimSize === 3 || lastDimSize === 4;
}


export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([A-F\d]{2})([A-F\d]{2})([A-F\d]{2})$/i.exec(hex);
  assert(Array.isArray(result) && result.length >= 4, 'Invalid hex color format');
  return [
    parseInt(result[1].toLowerCase(), 16),
    parseInt(result[2].toLowerCase(), 16),
    parseInt(result[3].toLowerCase(), 16),
  ];
}
