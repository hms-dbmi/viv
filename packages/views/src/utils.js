import { Matrix4 } from '@math.gl/core';
import { getImageSize } from '@vivjs/loaders';

import {
  MultiscaleImageLayer,
  ImageLayer,
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
  zoomBackOff = 0,
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
