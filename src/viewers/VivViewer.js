import React, { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { getVivId } from '../views/utils';

// Taken from https://stackoverflow.com/a/31732310/8060591
function isSafari() {
  return (
    navigator.vendor &&
    navigator.vendor.indexOf('Apple') > -1 &&
    navigator.userAgent &&
    navigator.userAgent.indexOf('CriOS') === -1 &&
    navigator.userAgent.indexOf('FxiOS') === -1
  );
}

/**
 * This component handles rendering the various views within the DeckGL contenxt.
 * @param {Array} layerProps The props for the layers in each view.
 * @param {VivView} views The various VivViews to render.
 * @param {Boolean} randomize Whether or not to randomize which view goes first to deck.gl
 * (for dynamic multi-view rendering.)
 * */
const VivViewer = ({ layerProps, views, randomize }) => {
  const initialViewStates = {};
  views.forEach(view => {
    initialViewStates[view.id] = view.filterViewState({
      viewState: view.initialViewState
    });
  });
  const [viewStates, setviewStates] = useState(initialViewStates);

  useEffect(() => {
    setviewStates(prevViewStates => {
      const newViewStates = {};
      views.forEach(view => {
        const { height, width } = view.initialViewState;
        const currentViewState = prevViewStates[view.id];
        newViewStates[view.id] = view.filterViewState({
          viewState: {
            ...(currentViewState || view.initialViewState),
            height,
            width,
            id: view.id
          }
        });
      });
      return newViewStates;
    });
  }, [views]);

  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {Layer} layer The layer being updated.
   * @param {Viewport} viewport The viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport
   */
  // eslint-disable-next-line class-methods-use-this
  const layerFilter = ({ layer, viewport }) => {
    return layer.id.includes(getVivId(viewport.id));
  };

  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL
   * (hence the need for storing viewState in state).
   */
  const _onViewStateChange = ({ viewId, viewState, oldViewState }) => {
    // Save the view state and trigger rerender
    setviewStates(prevViewStates => {
      const newViewStates = {};
      views.forEach(view => {
        const currentViewState = prevViewStates[view.id];
        newViewStates[view.id] = view.filterViewState({
          viewState: { ...viewState, id: viewId },
          oldViewState,
          currentViewState
        });
      });
      return newViewStates;
    });
  };

  /**
   * This renders the layers in the DeckGL context.
   */
  const _renderLayers = () => {
    return views.map((view, i) =>
      view.getLayer({ viewStates, props: layerProps[i] })
    );
  };

  const deckGLViews = views.map(view => view.getDeckGlView());

  // DeckGL seems to use the first view more than the second for updates
  // so this forces it to use the others more evenly.  This isn't perfect,
  // but I am not sure what else to do.  The DeckGL render hooks don't help,
  // but maybe useEffect() would help?  I couldn't work it out as
  // The issue is that I'm not sure how React would distinguish between forced updates
  // from permuting the views array and "real" updates like zoom/pan.
  // I tried keeping a counter but I couldn't figure out resetting it
  // without triggering a re-render.
  if (randomize) {
    const random = Math.random();
    const holdFirstElement = deckGLViews[0];
    // weight has to go to 1.5 because we use Math.round()
    const randomWieghted = random * 1.49;
    const randomizedIndex = Math.round(randomWieghted * (views.length - 1));
    deckGLViews[0] = deckGLViews[randomizedIndex];
    deckGLViews[randomizedIndex] = holdFirstElement;
  }
  return !isSafari() ? (
    <DeckGL
      glOptions={{ webgl2: true }}
      layerFilter={layerFilter}
      layers={_renderLayers()}
      onViewStateChange={_onViewStateChange}
      views={deckGLViews}
      viewState={viewStates}
    />
  ) : (
    <div className="viv-error">
      <p>
        Safari does not support WebGL2, which Viv requires. Please use Chrome or
        Firefox.
      </p>
    </div>
  );
};

export default VivViewer;
