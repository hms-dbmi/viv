import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import { Pool } from 'geotiff/dist/geotiff.bundle.min.js';
import { MicroscopyViewerLayerBase } from './microscopy-viewer-layer-base';
import { getTiffConnections, getZarrConnections } from './data-utils';

export class MicroscopyViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      connections: null,
      pool: null,
      imageWidth: 0,
      imageHeight: 0,
      tileSize: 0
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
        getTiffConnections({ ...this.props }).then(connections => {
          const firstFullImage = Object.values(connections[0])[0][0]
            .fileDirectory;
          this.setState({
            connections,
            pool: new Pool(),
            imageWidth: firstFullImage.ImageWidth,
            imageHeight: firstFullImage.ImageLength,
            tileSize: firstFullImage.TileWidth
          });
        });
      } else {
        getZarrConnections({ ...this.props }).then(connections => {
          const baseLayer = Object.values(connections[0])[0][0];
          const [ , imageHeight, imageWidth] = baseLayer.shape;
          const [ , , tileSize] = baseLayer.chunks;
          this.setState({
            connections,
            tileSize,
            imageHeight,
            imageWidth
          });
        });
      }
    }
  }

  renderLayers() {
    const { connections, pool, imageWidth, imageHeight, tileSize } = this.state;
    if (
      (this.props.imageWidth && imageWidth) ||
      (this.props.imageHeight && imageHeight) ||
      (this.props.tileSize && tileSize)
    ) {
      throw new Error('If using tiff, do not set image size');
    }
    const layers = connections
      ? new MicroscopyViewerLayerBase({
          connections: Object.assign({}, ...connections),
          pool,
          imageWidth,
          imageHeight,
          tileSize,
          minZoom: -1 * Object.values(connections[0])[0].length,
          maxZoom: 0,
          ...this.props
        })
      : [];
    return layers;
  }
}

MicroscopyViewerLayer.layerName = 'MicroscopyViewerLayer';
