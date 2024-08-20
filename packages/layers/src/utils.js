import { OrthographicView } from '@deck.gl/core';
import { Matrix4 } from '@math.gl/core';
import { DTYPE_VALUES, MAX_CHANNELS } from '@vivjs/constants';

export function range(len) {
  return [...Array(len).keys()];
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T} defaultValue
 * @param {number} padWidth
 */
export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

/**
 * (Safely) get GL values for associated dtype.
 * @param {keyof typeof DTYPE_VALUES} dtype
 */
export function getDtypeValues(dtype) {
  const values = DTYPE_VALUES[dtype];
  if (!values) {
    const valid = Object.keys(DTYPE_VALUES);
    throw Error(`Dtype not supported, got ${dtype}. Must be one of ${valid}.`);
  }
  return values;
}

/**
 * @param {{
 *   contrastLimits?: [min: number, max: number][],
 *   channelsVisible: boolean[],
 *   domain?: [min: number, max: number],
 *   dtype: keyof typeof DTYPE_VALUES,
 * }}
 */
export function padContrastLimits({
  contrastLimits = [],
  channelsVisible,
  domain,
  dtype
}) {
  const maxSliderValue = domain?.[1] || getDtypeValues(dtype).max;
  const newContrastLimits = contrastLimits.map((slider, i) =>
    channelsVisible[i]
      ? slider
      : /** @type {[number, number]} */ ([maxSliderValue, maxSliderValue])
  );
  // Need to pad contrastLimits and colors with default values (required by shader)
  const padSize = MAX_CHANNELS - newContrastLimits.length;
  if (padSize < 0) {
    throw Error(
      `${newContrastLimits.lengths} channels passed in, but only 6 are allowed.`
    );
  }

  const paddedContrastLimits = padWithDefault(
    newContrastLimits,
    [maxSliderValue, maxSliderValue],
    padSize
  ).reduce((acc, val) => acc.concat(val), []);

  return paddedContrastLimits;
}

export function onPointer(layer) {
  const { viewportId, lensRadius } = layer.props;
  // If there is no viewportId, don't try to do anything.
  if (!viewportId) {
    layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
    return;
  }
  const { mousePosition } = layer.context;
  const layerView = layer.context.deck.viewManager.views.filter(
    view => view.id === viewportId
  )[0];
  const viewState = layer.context.deck.viewManager.viewState[viewportId];
  const viewport = layerView.makeViewport({
    ...viewState,
    viewState
  });
  // If the mouse is in the viewport and the mousePosition exists, set
  // the state with the bounding box of the circle that will render as a lens.
  if (mousePosition && viewport.containsPixel(mousePosition)) {
    const offsetMousePosition = {
      x: mousePosition.x - viewport.x,
      y: mousePosition.y - viewport.y
    };
    const mousePositionBounds = [
      // left
      [offsetMousePosition.x - lensRadius, offsetMousePosition.y],
      // bottom
      [offsetMousePosition.x, offsetMousePosition.y + lensRadius],
      // right
      [offsetMousePosition.x + lensRadius, offsetMousePosition.y],
      // top
      [offsetMousePosition.x, offsetMousePosition.y - lensRadius]
    ];
    // Unproject from screen to world coordinates.
    const unprojectLensBounds = mousePositionBounds.map(
      (bounds, i) => viewport.unproject(bounds)[i % 2]
    );
    layer.setState({ unprojectLensBounds });
  } else {
    layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
  }
}

/**
 * Get physical size scaling Matrix4
 * @param {Object} loader PixelSource
 */
export function getPhysicalSizeScalingMatrix(loader) {
  const { x, y, z } = loader?.meta?.physicalSizes ?? {};
  if (x?.size && y?.size && z?.size) {
    const min = Math.min(z.size, x.size, y.size);
    const ratio = [x.size / min, y.size / min, z.size / min];
    return new Matrix4().scale(ratio);
  }
  return new Matrix4().identity();
}

/**
 * Create a bounding box from a viewport based on passed-in viewState.
 * @param {Object} viewState The viewState for a certain viewport.
 * @returns {View} The DeckGL View for this viewport.
 */
export function makeBoundingBox(viewState) {
  const viewport = new OrthographicView().makeViewport({
    // From the current `detail` viewState, we need its projection matrix (actually the inverse).
    viewState,
    height: viewState.height,
    width: viewState.width
  });
  // Use the inverse of the projection matrix to map screen to the view space.
  return [
    viewport.unproject([0, 0]),
    viewport.unproject([viewport.width, 0]),
    viewport.unproject([viewport.width, viewport.height]),
    viewport.unproject([0, viewport.height])
  ];
}

const TARGETS = [1, 2, 3, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MIN_TARGET = TARGETS[0];
const MAX_TARGET = TARGETS[TARGETS.length - 1];

const SI_PREFIXES = [
  { symbol: 'Y', exponent: 24 },
  { symbol: 'Z', exponent: 21 },
  { symbol: 'E', exponent: 18 },
  { symbol: 'P', exponent: 15 },
  { symbol: 'T', exponent: 12 },
  { symbol: 'G', exponent: 9 },
  { symbol: 'M', exponent: 6 },
  { symbol: 'k', exponent: 3 },
  { symbol: 'h', exponent: 2 },
  { symbol: 'da', exponent: 1 },
  { symbol: '', exponent: 0 },
  { symbol: 'd', exponent: -1 },
  { symbol: 'c', exponent: -2 },
  { symbol: 'm', exponent: -3 },
  { symbol: 'µ', exponent: -6 },
  { symbol: 'n', exponent: -9 },
  { symbol: 'p', exponent: -12 },
  { symbol: 'f', exponent: -15 },
  { symbol: 'a', exponent: -18 },
  { symbol: 'z', exponent: -21 },
  { symbol: 'y', exponent: -24 }
];

/**
 * Convert a size value to meters.
 * @param {number} size Size in original units.
 * @param {string} unit String like 'mm', 'cm', 'dam', 'm', 'km', etc.
 * @returns {number} Size in meters.
 */
export function sizeToMeters(size, unit) {
  if (!unit || unit === 'm') {
    // Already in meters.
    return size;
  }
  if (unit.length > 1) {
    // We remove the trailing 'm' from the unit, so 'cm' becomes 'c' and 'dam' becomes 'da'.
    let unitPrefix = unit.substring(0, unit.length - 1);
    // Support 'u' as a prefix for micrometers.
    if (unitPrefix === 'u') {
      unitPrefix = 'µ';
    }
    const unitObj = SI_PREFIXES.find(p => p.symbol === unitPrefix);
    if (unitObj) {
      return size * 10 ** unitObj.exponent;
    }
  }
  throw new Error('Received unknown unit');
}

/**
 * Snap any scale bar value to a "nice" value
 * like 1, 5, 10, 20, 25, 50, 100, 200, 250, 500.
 * If needed, will use different units.
 * @param {number} value Intended value for scale bar,
 * not necessarily a "nice" value. Assumed
 * to be in meters.
 * @returns {[number, number, string]} Tuple like
 * [nice value in meters, nice value in new units, SI prefix for new units].
 * The value in original units (meters) can be used to compute the size
 * in pixels for the scale bar. The value in new units can be
 * displayed in the text label of the scale bar.
 */
export function snapValue(value) {
  let magnitude = 0;

  // If the value is outside the range of our "nice" targets,
  // we compute the magnitude of change needed to bring it
  // into this range.
  if (value < MIN_TARGET || value > MAX_TARGET) {
    magnitude = Math.floor(Math.log10(value));
  }

  // While the magnitude will re-scale the value correctly,
  // it might not be a multiple of 3, so we use the nearest
  // SI prefix exponent. For example, if the magnitude is 4 or 5,
  // we would want to use an exponent of 3 (for 10 or 100 km),
  // since there is not an SI unit for exponents 4 nor 5.
  let snappedUnit = SI_PREFIXES.find(
    p => p.exponent % 3 === 0 && p.exponent <= magnitude
  );

  // We re-scale the original value so it is in the range of our
  // "nice" targets (between 1 and 1000).
  let adjustedValue = value / 10 ** snappedUnit.exponent;

  // The problem is that a value between 500 and 1000 will be snapped
  // to 1000, which is not what we want. We check for this here, and
  // snap to the next SI prefix if necessary. This will result in an adjusted
  // value of 1 (in the next SI unit) rather than 1000 (in the previous one).
  if (adjustedValue > 500 && adjustedValue <= 1000) {
    snappedUnit = SI_PREFIXES.find(
      p => p.exponent % 3 === 0 && p.exponent <= magnitude + 3
    );
    adjustedValue = value / 10 ** snappedUnit.exponent;
  }

  // We snap to the nearest target value. This will be the
  // number used in the text label.
  const targetNewUnits = TARGETS.find(t => t > adjustedValue);

  // We use the "nice" target value to re-compute the value in the
  // original units, which will be used to compute the size in pixels.
  const targetOrigUnits = targetNewUnits * 10 ** snappedUnit.exponent;

  return [targetOrigUnits, targetNewUnits, snappedUnit.symbol];
}

export function addAlpha(array) {
  if (!(array instanceof Uint8Array)) {
    throw new Error('Expected Uint8Array');
  }
  const alphaArray = new Uint8Array(array.length + array.length / 3);
  for (let i = 0; i < array.length / 3; i += 1) {
    alphaArray[i * 4] = array[i * 3];
    alphaArray[i * 4 + 1] = array[i * 3 + 1];
    alphaArray[i * 4 + 2] = array[i * 3 + 2];
    alphaArray[i * 4 + 3] = 255;
  }
  return alphaArray;
}
