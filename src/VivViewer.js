import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';
import OverviewView from './OverviewView';

export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    const {
      initialViewState,
      overview,
      viewWidth,
      viewHeight,
      loader
    } = this.props;
    const vivOverview = overview
      ? new OverviewView({
          ...overview,
          viewWidth,
          viewHeight,
          loader,
          margin: overview.margin,
          overviewScale: overview.scale
        })
      : null;
    this.state = {
      viewState: {
        detail: { ...initialViewState, id: 'detail' },
        overview: overview ? vivOverview.getViewState(initialViewState) : null
      },
      overview: vivOverview
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
    // const { overview } = this.state;
    this.setState(prevState => {
      const newState = { ...prevState };
      newState.viewState = { ...newState.viewState, [viewId]: viewState };
      return newState;
    });
  }

  componentDidUpdate(prevProps) {
    const { overview, viewWidth, viewHeight, loader } = this.props;
    if (prevProps.overview !== overview) {
      if (overview) {
        // Overview is turned on.
        const vivOverview = new OverviewView({
          ...overview,
          viewWidth,
          viewHeight,
          loader,
          margin: overview.margin,
          overviewScale: overview.scale
        });
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState(prevState => {
          const newViewState = { ...prevState.viewState };
          newViewState.overview = vivOverview.getViewState(
            prevState.viewState.detail
          );
          return { viewState: newViewState, overview: vivOverview };
        });
      } else {
        // Overview is turned off.
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState(prevState => {
          const newViewState = { ...prevState.viewState };
          newViewState.overview = null;
          return { viewState: newViewState, overview: null };
        });
      }
    }
  }

  // For now this is hardcoded but in general we should look at
  // a proper structure for taking lists of configurations so that
  // we can handle multiple overlapping layers.
  // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
  _renderLayers() {
    const { loader } = this.props;
    const { viewState, overview } = this.state;
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
    const { loader } = this.props;
    const { overview } = this.state;

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
