import { OrthographicView } from '@deck.gl/core';

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

export function getDefaultInitialViewState(loader, viewSize) {
  const { height, width } = loader.getRasterSize({
    z: 0
  });
  // Get a reasonable initial zoom level for pyramids based on screen size.
  const { isPyramid } = loader;
  let zoom = 0;
  let size = Infinity;
  // viewSize is not in the dependencies array becuase we only want to use it when the source changes.
  if (isPyramid) {
    while (size >= Math.max(...Object.values(viewSize))) {
      const rasterSize = loader.getRasterSize({
        z: zoom
      });
      size = Math.max(...Object.values(rasterSize));
      zoom += 1;
    }
  }
  const loaderInitialViewState = {
    target: [height / 2, width / 2, 0],
    zoom: isPyramid ? -zoom : -1.5
  };
  return loaderInitialViewState;
}
