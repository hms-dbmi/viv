import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';

export default class VivViewer extends PureComponent {
  _renderLayers() {
    const { loader } = this.props;
    // For now this is hardcoded but in general we should look at
    // a proper structure for taking lists of configurations so that
    // we can handle multiple overlapping layers.
    // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
    return loader.isPyramid
      ? new VivViewerLayer({
          id: `VivViewerLayer-${loader.type}}`,
          ...this.props
        })
      : new StaticImageLayer({
          id: `StaticImageLayer-${loader.type}}`,
          ...this.props
        });
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const views = [
      new OrthographicView({
        id: 'ortho',
        controller: true,
        height: this.props.viewHeight,
        width: this.props.viewWidth
      })
    ];
    const { initialViewState } = this.props;
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layers={this._renderLayers()}
        initialViewState={initialViewState}
        controller
        views={views}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
