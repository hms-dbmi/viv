import { Matrix4 } from '@math.gl/core';
import { getImageSize } from '@vivjs/loaders';

import {
  ImageLayer,
  MultiscaleImageLayer,
  getPhysicalSizeScalingMatrix
} from '@vivjs/layers';

export function getVivId(id) {
  return `-#${id}#`;
}

/**
 * Create an initial view state that centers the image in the viewport at the zoom level that fills the dimensions in `viewSize`.
 * @param {Object} loader (PixelSource[] | PixelSource)
 * @param {Object} viewSize { height, width } object giving dimensions of the viewport for deducing the right zoom level to center the image.
 * @param {Object=} zoomBackOff A positive number which controls how far zoomed out the view state is from filling the entire viewport (default is 0 so the image fully fills the view).
 * SideBySideViewer and PictureInPictureViewer use .5 when setting viewState automatically in their default behavior, so the viewport is slightly zoomed out from the image
 * filling the whole screen.  1 unit of zoomBackOff (so a passed-in value of 1) corresponds to a 2x zooming out.
 * @param {Boolean=} use3d Whether or not to return a view state that can be used with the 3d viewer
 * @param {Boolean=} modelMatrix If using a transformation matrix, passing it in here will allow this function to properly center the volume.
 * @returns {Object} A default initial view state that centers the image within the view: { target: [x, y, 0], zoom: -zoom }.
 */
export function getDefaultInitialViewState(
  loader,
  viewSize,
  // biome-ignore lint/style/useDefaultParameterLast: Public API requires zoomBackOff to be the third parameter
  zoomBackOff = 0,
  // biome-ignore lint/style/useDefaultParameterLast: Public API requires use3d to be the fourth parameter
  use3d = false,
  modelMatrix
) {
  const source = Array.isArray(loader) ? loader[0] : loader;
  const { width: pixelWidth, height: pixelHeight } = getImageSize(source);
  const scale = (modelMatrix || new Matrix4()).getScale();
  const [trueWidth, trueHeight] = [
    scale[0] * pixelWidth,
    scale[1] * pixelHeight
  ];
  const depth = source.shape[source.labels.indexOf('z')];
  const zoom =
    Math.log2(
      Math.min(viewSize.width / trueWidth, viewSize.height / trueHeight)
    ) - zoomBackOff;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const loaderInitialViewState = {
    target: (modelMatrix || new Matrix4()).transformPoint(
      (use3d ? physicalSizeScalingMatrix : new Matrix4()).transformPoint([
        pixelWidth / 2,
        pixelHeight / 2,
        use3d ? depth / 2 : 0
      ])
    ),
    zoom
  };
  return loaderInitialViewState;
}

/**
 * Creates the layers for viewing an image in detail.
 * @param {String} id The identifier of the view.
 * @param {Object} props The layer properties.
 * @returns {Array} An array of layers.
 */
export function getImageLayer(id, props) {
  const { loader } = props;
  // Grab name of PixelSource if a class instance (works for Tiff & Zarr).
  const sourceName = loader[0]?.constructor?.name;

  // Create at least one layer even without selections so that the tests pass.
  const Layer = loader.length > 1 ? MultiscaleImageLayer : ImageLayer;
  const layerLoader = loader.length > 1 ? loader : loader[0];

  return new Layer({
    ...props,
    id: `${sourceName}${getVivId(id)}`,
    viewportId: id,
    loader: layerLoader
  });
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
