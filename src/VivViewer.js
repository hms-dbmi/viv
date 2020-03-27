import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';

function layerFilter({ layer, viewport }) {
  if (viewport.id === 'overview' && layer.id.includes('overview')) {
    // Draw the static layer in the overview
    return true;
  }
  if (viewport.id === 'detail' && layer.id.includes('detail')) {
    // Draw the tiledLayer in the detail
    return true;
  }
  return null;
}

export default class VivViewer extends PureComponent {

  constructor(props){
      super(props)
      const { initialViewState, loader } = this.props;
      const { numLevels } = loader;
      const { imageWidth, imageHeight } = loader.getRasterSize({ z: 0 });
      this.state = {viewStates: {
        detail: {...initialViewState}, 
        overview: {...initialViewState, target: [imageWidth / 2, imageHeight / 2, 0], zoom: -1.1 * (numLevels - 1)}
      }
    }
    this._onViewStateChange = this._onViewStateChange.bind(this)
  }
  
  _onViewStateChange({ viewId, viewState }) {
    if (viewId === 'detail') {
      // Save the view state and trigger rerender
      const { loader } = this.props;
      const { numLevels } = loader;
      const { imageWidth, imageHeight } = loader.getRasterSize({ z: 0 });
      const viewStates = {};
      viewStates.detail = viewState;
      viewStates.overview = {
        ...viewState,
        target: [imageWidth / 2, imageHeight / 2, 0],
        zoom: -1.1 * (numLevels - 1)
      };
      this.setState({viewStates})
    }
  };


  _renderLayers() {
    const { loader } = this.props;
    // For now this is hardcoded but in general we should look at
    // a proper structure for taking lists of configurations so that
    // we can handle multiple overlapping layers.
    // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
    const { numLevels } = loader;
    return loader.isPyramid
      ? [
        new VivViewerLayer({
          id: `${loader.type}-detail`,
          ...this.props
        }),
        new StaticImageLayer(this.props, {
          id: `${loader.type}-overview`,
          scale: 2 ** (numLevels - 1),
          z: numLevels - 1
        })]
      : new StaticImageLayer({
          id: `StaticImageLayer-${loader.type}`,
          ...this.props
        });
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
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
        height: this.props.viewHeight / 5,
        width: this.props.viewWidth / 5,
        x: this.props.viewWidth - this.props.viewWidth / 5,
        y: this.props.viewHeight - this.props.viewHeight / 5,
        clear:true
      })
    ];
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layerFilter={layerFilter}
        layers={this._renderLayers()}
        viewState={this.state.viewStates}
        onViewStateChange={this._onViewStateChange}
        controller
        views={views}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
