import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';

export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewState: {}
    };
    const { viewState } = this.state;
    const { views, initViewState } = this.props;
    views.array.forEach((view, i) => {
      viewState[view.id] = view.getViewState(
        initViewState instanceof Array ? initViewState[i] : initViewState
      );
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
  }

  // This prevents only the `draw` call of a layer from firing,
  // but not other layer lifecycle methods.  Nonetheless, it is
  // still useful.
  // eslint-disable-next-line class-methods-use-this
  layerFilter({ layer, viewport }) {
    if (layer.id.includes(viewport.id)) {
      // Draw the static layer in the overview
      return true;
    }
    return false;
  }

  _onViewStateChange({ viewId, viewState }) {
    // Save the view state and trigger rerender
    // const { overview } = this.state;
    this.setState(prevState => {
      const newState = { ...prevState };
      newState.viewState = { ...newState.viewState, [viewId]: viewState };
      return newState;
    });
  }

  // For now this is hardcoded but in general we should look at
  // a proper structure for taking lists of configurations so that
  // we can handle multiple overlapping layers.
  // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
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

    const { deckGLViews } = views.map(view => view.getDeckGlView());

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
