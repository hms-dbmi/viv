import { useState } from 'react'; // eslint-disable-line import/no-unresolved

export default function useGlobalSelection(loaderSelection, transitionFields) {
  // viewportSelection is the last selection that had an onViewportLoad callback.
  const [viewportSelection, setViewportSelection] = useState(loaderSelection);
  let onViewportLoad;
  let newLoaderSelection = null;
  let oldLoaderSelection = loaderSelection;
  if (
    loaderSelection?.length &&
    viewportSelection?.length &&
    transitionFields.some(
      f => loaderSelection[0][f] !== viewportSelection[0][f]
    )
  ) {
    // onViewportLoad is a property of TileLayer that is passed through:
    // https://deck.gl/docs/api-reference/geo-layers/tile-layer#onviewportload
    onViewportLoad = () => {
      // Slightly delay to avoid issues with a render in the middle of a deck.gl layer state update.
      setTimeout(() => {
        setViewportSelection(loaderSelection);
      }, 0);
    };
    // Set newLoaderSelection to cause the creation of an extra tile layer.
    newLoaderSelection = loaderSelection;
    oldLoaderSelection = viewportSelection;
  }
  return { newLoaderSelection, oldLoaderSelection, onViewportLoad };
}
