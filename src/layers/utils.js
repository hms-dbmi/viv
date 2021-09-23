import { Matrix4 } from 'math.gl';
import {
  MAX_COLOR_INTENSITY,
  DEFAULT_COLOR_OFF,
  MAX_CHANNELS,
  DTYPE_VALUES
} from '../constants';

export function range(len) {
  return [...Array(len).keys()];
}

export function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

/**
 * (Safely) get GL values for associated dtype.
 * @param {keyof typeof import('../constants').DTYPE_VALUES} dtype
 */
export function getDtypeValues(dtype) {
  const values = DTYPE_VALUES[dtype];
  if (!values) {
    const valid = Object.keys(DTYPE_VALUES);
    throw Error(`Dtype not supported, got ${dtype}. Must be one of ${valid}.`);
  }
  return values;
}

export function padColorsAndWindows({
  contrastLimits,
  colors,
  channelsVisible,
  domain,
  dtype
}) {
  const lengths = [contrastLimits.length, colors.length];
  if (lengths.every(l => l !== lengths[0])) {
    throw Error('Inconsistent number of slider values and colors provided');
  }

  const newColors = colors.map((color, i) =>
    channelsVisible[i]
      ? color.map(c => c / MAX_COLOR_INTENSITY)
      : DEFAULT_COLOR_OFF
  );
  const maxSliderValue = (domain && domain[1]) || getDtypeValues(dtype).max;
  const newContrastLimits = contrastLimits.map((slider, i) =>
    channelsVisible[i] ? slider : [maxSliderValue, maxSliderValue]
  );
  // Need to pad contrastLimits and colors with default values (required by shader)
  const padSize = MAX_CHANNELS - newColors.length;
  if (padSize < 0) {
    throw Error(`${lengths} channels passed in, but only 6 are allowed.`);
  }

  const paddedColors = padWithDefault(newColors, DEFAULT_COLOR_OFF, padSize);
  const paddedContrastLimits = padWithDefault(
    newContrastLimits,
    [maxSliderValue, maxSliderValue],
    padSize
  );
  const paddedColorsAndWindows = {
    paddedContrastLimits: paddedContrastLimits.reduce(
      (acc, val) => acc.concat(val),
      []
    ), // flatten for use on shaders
    paddedColors: paddedColors.reduce((acc, val) => acc.concat(val), [])
  };

  return paddedColorsAndWindows;
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
