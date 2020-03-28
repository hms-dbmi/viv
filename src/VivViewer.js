import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';
import OverviewLayer from './layers/OverviewLayer';

export default class VivViewer extends PureComponent {
constructor(props) {
  super(props);
  const { initialViewState, loader } = this.props;
  const { numLevels } = loader;
  const { imageWidth, imageHeight } = loader.getRasterSize({
    z: 0
  });
  this.state = {
    viewState: {
      detail: { ...initialViewState, id: 'detail' },
      overview: {
        ...initialViewState,
        target: [imageWidth / 2, imageHeight / 2, 0],
        zoom: -(numLevels - 1),
        id: 'overview'
      }
    }
  };
  this._onViewStateChange = this._onViewStateChange.bind(this);
  this.layerFilter = this.layerFilter.bind(this);
}

// eslint-disable-next-line class-methods-use-this
layerFilter({ layer, viewport }) {
  if (layer.id.includes(viewport.id)) {
    // Draw the static layer in the overview
    return true;
  }
  return false;
}

_onViewStateChange({ viewId, viewState }) {
  if (viewId === 'detail') {
    // Save the view state and trigger rerender
    const { loader } = this.props;
    const { numLevels } = loader;
    const { imageWidth, imageHeight } = loader.getRasterSize({
      z: 0
    });
    const newViewState = {};
    newViewState.detail = viewState;
    newViewState.overview = {
      ...viewState,
      target: [imageWidth / 2, imageHeight / 2, 0],
      zoom: -(numLevels - 1)
    };
    this.setState({ viewState: newViewState });
  }
}

_renderLayers() {
  const { loader, viewHeight, viewWidth } = this.props;
  const { viewState } = this.state
  // For now this is hardcoded but in general we should look at
  // a proper structure for taking lists of configurations so that
  // we can handle multiple overlapping layers.
  // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
  const viewport = new OrthographicView().makeViewport({
    viewState: viewState.detail,
    height: viewHeight,
    width: viewWidth
  });
  const boundingBox = [
    viewport.unproject([0, 0]),
    viewport.unproject([viewport.width, 0]),
    viewport.unproject([viewport.width, viewport.height]),
    viewport.unproject([0, viewport.height]),
  ];
  return loader.isPyramid
    ? [
        new VivViewerLayer({
          id: `${loader.type}-detail`,
          viewportId: 'detail',
          ...this.props
        }),
        new OverviewLayer(this.props, {
          id: `${loader.type}-overview`,
          boundingBox,
          ...this.props
        })
      ]
    : new StaticImageLayer({
        id: `StaticImageLayer-${loader.type}`,
        ...this.props
      });
}

render() {
  /* eslint-disable react/destructuring-assignment */
  const { loader } = this.props;
  const { numLevels } = loader;
  const { imageWidth, imageHeight } = loader.getRasterSize({
    z: 0
  });
  const views = [
    new OrthographicView({
      id: 'detail',
      controller: true,
      height: this.props.viewHeight,
      width: this.props.viewWidth
    }),
    new OrthographicView({
      id: 'overview',
      controller: false,
      height: imageHeight >> (numLevels - 1),
      width: imageWidth >> (numLevels - 1),
      x: this.props.viewWidth - (imageWidth >> (numLevels - 1)),
      y: this.props.viewHeight - (imageHeight >> (numLevels - 1)),
      clear: true
    })
  ];
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
