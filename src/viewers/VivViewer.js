import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { getVivId } from '../views/utils';

/**
 * This component handles rendering the various views within the DeckGL contenxt.
 * @param {Object} props
 * @param {Array} props.layerProps  Props for the layers in each view.
 * @param {Array} props.randomize Whether or not to randomize which view goes first (for dynamic rendering).
 * @param {VivView} props.views Various VivViews to render.
 * */
export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewStates: {}
    };
    const { viewStates } = this.state;
    const { views } = this.props;
    views.forEach(view => {
      viewStates[view.id] = view.filterViewState({
        viewState: view.initialViewState
      });
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
    this.onHover = this.onHover.bind(this);
  }

  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {Layer} layer Layer being updated.
   * @param {Viewport} viewport Viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport.
   */
  // eslint-disable-next-line class-methods-use-this
  layerFilter({ layer, viewport }) {
    return layer.id.includes(getVivId(viewport.id));
  }

  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL
   * (hence the need for storing viewState in state).
   */
  _onViewStateChange({ viewId, viewState, oldViewState }) {
    // Save the view state and trigger rerender.
    const { views } = this.props;
    this.setState(prevState => {
      const viewStates = {};
      views.forEach(view => {
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: { ...viewState, id: viewId },
          oldViewState,
          currentViewState
        });
      });
      return { viewStates };
    });
  }

  /**
   * This updates the viewStates' height and width with the newest height and
   * width on any call where the viewStates changes (i.e resize events),
   * using the previous state (falling back on the view's initial state) for target x and y, zoom level etc.
   */
  static getDerivedStateFromProps(props, prevState) {
    const { views } = props;
    // Update internal viewState on view changes as well as height and width changes.
    // Maybe we should add x/y too?
    if (
      views.some(
        view =>
          !prevState.viewStates[view.id] ||
          view.initialViewState.height !==
            prevState.viewStates[view.id].height ||
          view.initialViewState.width !== prevState.viewStates[view.id].width
      )
    ) {
      const viewStates = {};
      views.forEach(view => {
        const { height, width } = view.initialViewState;
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: {
            ...(currentViewState || view.initialViewState),
            height,
            width,
            id: view.id
          }
        });
      });
      return { viewStates };
    }
    return prevState;
  }

  // eslint-disable-next-line consistent-return
  onHover({ sourceLayer, coordinate, layer }) {
    if (!coordinate) {
      return null;
    }
    const { hoverHooks } = this.props;
    if (!hoverHooks) {
      return null;
    }
    const { handleValue } = hoverHooks;
    if (!handleValue) {
      return null;
    }
    const { channelData, bounds } = sourceLayer.props;
    if (!channelData) {
      return null;
    }
    const { data, width } = channelData;
    if (!data) {
      return null;
    }
    let dataCoords;
    // This is currently a work-around for: https://github.com/visgl/deck.gl/pull/4526.
    // Once this is fixed we can make something more robust.
    if (sourceLayer.id.includes('Background')) {
      const { numLevels } = layer.props.loader;
      // The zoomed out layer needs to use the fixed zoom at which it is rendered (i.e numLevels - 1).
      const layerZoomScale = Math.max(1, 2 ** Math.floor(numLevels - 1));
      dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
    } else {
      // Using floor means that as we zoom out, we are scaling by the zoom just passed, not the one coming.
      const { zoom } = layer.context.viewport;
      const layerZoomScale = Math.max(1, 2 ** Math.floor(-zoom));
      dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
    }
    const coords = dataCoords[1] * width + dataCoords[0];
    const hoverData = data.map(d => d[coords]);
    handleValue(hoverData);
  }

  /**
   * This renders the layers in the DeckGL context.
   */
  _renderLayers() {
    const { onHover } = this;
    const { viewStates } = this.state;
    const { views, layerProps } = this.props;
    return views.map((view, i) =>
      view.getLayers({
        viewStates,
        props: {
          ...layerProps[i],
          onHover
        }
      })
    );
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const { views, randomize } = this.props;
    const { viewStates } = this.state;
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
      // weight has to go to 1.5 because we use Math.round().
      const randomWieghted = random * 1.49;
      const randomizedIndex = Math.round(randomWieghted * (views.length - 1));
      deckGLViews[0] = deckGLViews[randomizedIndex];
      deckGLViews[randomizedIndex] = holdFirstElement;
    }
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layerFilter={this.layerFilter}
        layers={this._renderLayers()}
        onViewStateChange={this._onViewStateChange}
        views={deckGLViews}
        viewState={viewStates}
        getCursor={({ isDragging }) => {
          return isDragging ? 'grabbing' : 'crosshair';
        }}
      />
    );

    /* eslint-disable react/destructuring-assignment */
  }
}
