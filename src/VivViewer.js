import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';

/**
 * This class handles rendering the various views within the DeckGL contenxt.
 * @param {Array} layerProps The props for the layers in each view.
 * @param {Array} initViewState The initial view states for each view.
 * @param {VivView} views The various VivViews to render.
 * */
export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewState: {}
    };
    const { viewState } = this.state;
    const { views, initViewState } = this.props;
    views.forEach((view, i) => {
      viewState[view.id] = view.getViewState(initViewState[i]);
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
    if (layer.id.includes(`-${viewport.id}#`)) {
      // Draw the static layer in the overview
      return true;
    }
    return false;
  }

  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL.
   */
  _onViewStateChange({ viewId, viewState }) {
    // Save the view state and trigger rerender
    // const { overview } = this.state;
    const { views } = this.props;
    this.setState(prevState => {
      const newState = { ...prevState };
      views.forEach(view => {
        newState.viewState = {
          ...newState.viewState,
          [view.id]:
            view.getViewState({ ...viewState, id: viewId }) ||
            prevState.viewState[view.id]
        };
      });
      return newState;
    });
  }

  componentDidUpdate(prevProps) {
    const { views, viweWidth, viewHeight } = this.props;
    if (
      prevProps.views !== views ||
      prevProps.viweWidth !== viweWidth ||
      prevProps.viewHeight !== viewHeight
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(prevState => {
        const newState = { ...prevState };
        views.forEach(view => {
          newState.viewState = {
            ...newState.viewState,
            [view.id]: view.getViewState(
              prevState.viewState[view.id] || view.initViewState
            )
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
    const { viewState } = this.state;
    const { views, layerProps } = this.props;
    return views.map((view, i) =>
      view.getLayer({ viewState, props: layerProps[i] })
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
        viewState={this.state.viewState}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
