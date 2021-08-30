import { useState } from 'react'; // eslint-disable-line import/no-unresolved

export default function useGlobalSelection(selections, transitionFields) {
  // viewportSelection is the last selection that had an onViewportLoad callback.
  const [viewportSelection, setViewportSelection] = useState(selections);
  let onViewportLoad;
  let newselections = null;
  let oldselections = selections;
  if (
    selections?.length &&
    viewportSelection?.length &&
    transitionFields.some(f => selections[0][f] !== viewportSelection[0][f])
  ) {
    // onViewportLoad is a property of TileLayer that is passed through:
    // https://deck.gl/docs/api-reference/geo-layers/tile-layer#onviewportload
    onViewportLoad = () => setViewportSelection(selections);
    // Set newselections to cause the creation of an extra tile layer.
    newselections = selections;
    oldselections = viewportSelection;
  }
  return { newselections, oldselections, onViewportLoad };
}
