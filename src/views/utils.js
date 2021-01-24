import { OrthographicView } from '@deck.gl/core';
import { getImageSize } from '../loaders/utils';

// Do not import from '../layers' because that causes a circular dependency.
import MultiscaleImageLayer from '../layers/MultiscaleImageLayer';
import ImageLayer from '../layers/ImageLayer';

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
 * @param {Object} loader PixelSource[]
 * @param {Object} viewSize { height, width } object giving dimensions of the viewport for deducing the right zoom level to center the image.
 * @param {Object} zoomBackOff A positive number which controls how far zoomed out the view state is from filling the entire viewport (default is 0 so the image fully fills the view).
 * SideBySideViewer and PictureInPictureViewer use .5 when setting viewState automatically in their default behavior, so the viewport is slightly zoomed out from the image
 * filling the whole screen.  1 unit of zoomBackOff (so a passed-in value of 1) corresponds to a 2x zooming out.
 * @returns {ViewState} A default initial view state that centers the image within the view: { target: [x, y, 0], zoom: -zoom }.
 */
export function getDefaultInitialViewState(loader, viewSize, zoomBackOff = 0) {
  const { width, height } = getImageSize(loader[0]);
  const zoom =
    Math.log2(Math.min(viewSize.width / width, viewSize.height / height)) -
    zoomBackOff;
  const loaderInitialViewState = {
    target: [width / 2, height / 2, 0],
    zoom
  };
  return loaderInitialViewState;
}

/**
 * Creates the layers for viewing an image in detail.
 * @param {string} id The identifier of the view.
 * @param {Object} props The layer properties.
 * @returns {Array} An array of layers.
 */
export function getImageLayers(id, props) {
  const {
    loaderSelection,
    newLoaderSelection,
    onViewportLoad,
    transitionFields,
    ...layerProps
  } = props;
  const { loader } = layerProps;

  // Create at least one layer even without loaderSelection so that the tests pass.
  if (loader.length === 1) {
    return [
      new ImageLayer(layerProps, {
        id: `${loader.type}${getVivId(id)}`,
        viewportId: id,
        loaderSelection,
        loader: loader[0] // should just be a pixel source
      })
    ];
  }
  // isPyramid
  return [loaderSelection, newLoaderSelection]
    .filter((s, i) => i === 0 || s)
    .map((s, i) => {
      const suffix = s
        ? `-${transitionFields.map(f => s[0][f]).join('-')}`
        : '';
      const newProps =
        i !== 0
          ? {
              onViewportLoad,
              refinementStrategy: 'never',
              excludeBackground: true
            }
          : {};
      return new MultiscaleImageLayer({
        ...layerProps,
        ...newProps,
        loaderSelection: s,
        id: `${loader.type}${getVivId(id)}${suffix}`,
        viewportId: id,
        loader // array of pixel sources
      });
    });
}
