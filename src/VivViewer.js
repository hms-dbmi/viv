import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';

export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    const { initialViewState, overview } = this.props;
    this.state = {
      viewState: {
        detail: { ...initialViewState, id: 'detail' },
        overview: overview ? overview.getViewState(initialViewState) : null
      }
    };
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
    // only for changes to the `detail` view
    if (viewId === 'detail') {
      const { overview } = this.props;
      const newViewState = {};
      newViewState.detail = viewState;
      newViewState.overview = overview
        ? overview.getViewState(viewState)
        : null;
      this.setState({ viewState: newViewState });
    }
  }

  componentDidUpdate(prevProps) {
    const { overview } = this.props;
    if (prevProps.overview !== overview) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(prevState => {
        const newViewState = { ...prevState.viewState };
        newViewState.overview = overview
          ? overview.getViewState(prevState.viewState.detail)
          : null;
        return { viewState: newViewState };
      });
    }
  }

  // For now this is hardcoded but in general we should look at
  // a proper structure for taking lists of configurations so that
  // we can handle multiple overlapping layers.
  // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
  _renderLayers() {
    const { loader, overview } = this.props;
    const { viewState } = this.state;
    if (loader.isPyramid) {
      const layers = [
        new VivViewerLayer({
          id: `${loader.type}-detail`,
          // Because TileLayer is unique in updating on viewport changes,
          // it needs to be aware of what viewport it is rendering in -
          // layerFilter only handles `draw` calls.
          viewportId: 'detail',
          ...this.props
        })
      ];
      if (overview) {
        layers.push(
          overview.getLayer({ viewState: viewState.detail, props: this.props })
        );
        return layers;
      }
      return layers;
    }

    return new StaticImageLayer({
      id: `StaticImageLayer-${loader.type}-detail`,
      ...this.props
    });
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const { loader, overview } = this.props;
    const views = [
      new OrthographicView({
        id: 'detail',
        controller: true,
        height: this.props.viewHeight,
        width: this.props.viewWidth
      })
    ];

    if (loader.isPyramid && overview) {
      views.push(overview.getView());
    }
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layerFilter={this.layerFilter}
        layers={this._renderLayers()}
        onViewStateChange={this._onViewStateChange}
        views={views}
        viewState={this.state.viewState}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
