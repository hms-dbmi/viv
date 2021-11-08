import { OrthographicView } from '@deck.gl/core';
import { Matrix4 } from 'math.gl';
import { getImageSize } from '../loaders/utils';

// Do not import from '../layers' because that causes a circular dependency.
import MultiscaleImageLayer from '../layers/MultiscaleImageLayer';
import ImageLayer from '../layers/ImageLayer';
import { getPhysicalSizeScalingMatrix } from '../layers/utils';

export function getVivId(id) {
  return `-#${id}#`;
}
/**
 * Create a boudning box from a viewport based on passed-in viewState.
 * @param {viewState} Object The viewState for a certain viewport.
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
  const { width, height } = getImageSize(source);
  const depth = source.shape[source.labels.indexOf('z')];
  const zoom =
    Math.log2(Math.min(viewSize.width / width, viewSize.height / height)) -
    zoomBackOff;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const loaderInitialViewState = {
    target: (modelMatrix || new Matrix4()).transformPoint(
      (use3d ? physicalSizeScalingMatrix : new Matrix4()).transformPoint([
        width / 2,
        height / 2,
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
