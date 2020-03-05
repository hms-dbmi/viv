import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer } from './layers';

function getTypeIdentifier(useTiff, useZarr) {
  if (useTiff) {
    return 'tiff';
  }
  if (useZarr) {
    return 'zarr';
  }
  return 'other-data';
}

export default class VivViewer extends PureComponent {
  _renderLayers() {
    const { loader } = this.props;
    return new MicroscopyViewerLayer({
      id: `MicroscopyViewerLayer-${loader.type}}`,
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
