import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import { Pool } from 'geotiff/dist/geotiff.bundle.min.js';
import { MicroscopyViewerLayerBase } from './microscopy-viewer-layer-base';
import { initTiff, initZarr } from './data-utils';

export class MicroscopyViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      connections: null,
      pool: null,
      imageWidth: 0,
      imageHeight: 0,
      tileSize: 0,
      minZoom: 0,
    };
  }

  // see https://github.com/uber/deck.gl/blob/master/docs/api-reference/layer.md#shouldupdatestate
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  updateState() {
    if (!this.state.connections) {
      if (this.props.useTiff) {
        initTiff({ ...this.props }).then(({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
          this.setState({
            connections,
            minZoom,
            imageWidth,
            imageHeight,
            tileSize,
            pool: new Pool(),
          });
        });
      } else {
        initZarr({ ...this.props }).then(({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
          this.setState({
            connections,
            minZoom,
            imageWidth,
            imageHeight,
            tileSize,
          });
        });
      }
    }
  }

  renderLayers() {
    const { connections, pool, imageWidth, imageHeight, tileSize, minZoom } = this.state;
    if (
      (this.props.imageWidth && imageWidth) ||
      (this.props.imageHeight && imageHeight) ||
      (this.props.tileSize && tileSize)
    ) {
      throw new Error('If using tiff, do not set image size');
    }
    const layers = connections
      ? new MicroscopyViewerLayerBase({
          connections,
          pool,
          imageWidth,
          imageHeight,
          tileSize,
          minZoom,
          maxZoom: 0,
          ...this.props
        })
      : [];
    return layers;
  }
}

MicroscopyViewerLayer.layerName = 'MicroscopyViewerLayer';
