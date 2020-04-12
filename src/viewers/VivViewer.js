import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { getVivId } from '../views/utils';

/**
 * This class handles rendering the various views within the DeckGL contenxt.
 * @param {Array} layerProps The props for the layers in each view.
 * @param {Array} viewStates The initial view states for each view.
 * @param {VivView} views The various VivViews to render.
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
      viewStates[view.id] = view.getViewState({
        viewState: view.initialViewState
      });
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
  }

  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {Layer} layer The layer being updated.
   * @param {Viewport} viewport The viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport
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
    // Save the view state and trigger rerender
    // const { overview } = this.state;
    const { views } = this.props;
    this.setState(prevState => {
      const newState = { ...prevState };
      views.forEach(view => {
        newState.viewStates = {
          ...newState.viewStates,
          [view.id]:
            view.getViewState({
              viewState: { ...viewState, id: viewId },
              oldViewState,
              currentViewState: prevState.viewStates[view.id]
            }) || prevState.viewStates[view.id]
        };
      });
      return newState;
    });
  }

  /**
   * This updates the viewStates' height and width with the newest height and
   * width on any call where the viewStates changes (i.e resize events),
   * using the previous state (falling back on the view's initial state) for target x and y, zoom level etc.
   */
  componentDidUpdate(prevProps) {
    const { views } = this.props;
    // Update internal viewState on view changes as well as height and width changes.
    // Maybe we should add x/y too?
    if (
      views.some(
        (view, i) =>
          prevProps.views[i] !== view ||
          view.initialViewState.height !==
            prevProps.views[i].initialViewState.height ||
          view.initialViewState.width !==
            prevProps.views[i].initialViewState.width
      )
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(prevState => {
        const newState = { ...prevState };
        views.forEach(view => {
          const { height, width } = view.initialViewState;
          newState.viewStates = {
            ...newState.viewStates,
            [view.id]: view.getViewState({
              viewState: {
                ...(prevState.viewStates[view.id] || view.initialViewState),
                height,
                width
              }
            })
          };
        });
        return newState;
      });
    }
  }

  /**
   * This renders the layers in the DeckGL context.
   */
  _renderLayers() {
    const { viewStates } = this.state;
    const { views, layerProps } = this.props;
    return views.map((view, i) =>
      view.getLayer({ viewStates, props: layerProps[i] })
    );
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const { views } = this.props;
    const deckGLViews = views.map(view => view.getDeckGlView());
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layerFilter={this.layerFilter}
        layers={this._renderLayers()}
        onViewStateChange={this._onViewStateChange}
        views={deckGLViews}
        viewState={this.state.viewStates}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
