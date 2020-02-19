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
      isZarr: false,
      isTiff: false,
      imageWidth: 0,
      imageHeight: 0,
      tileSize: 0,
      minZoom: 0
    };
  }

  // see https://github.com/uber/deck.gl/blob/master/docs/api-reference/layer.md#shouldupdatestate
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  updateState() {
    /* eslint-disable no-bitwise */
    if (
      !this.state.connections ||
      this.props.useTiff ^ this.state.isTiff ||
      this.props.useZarr ^ this.state.isZarr
    ) {
      /* eslint-disable no-bitwise */
      if (this.props.useTiff) {
        initTiff({ ...this.props }).then(
          ({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
            this.setState({
              connections,
              minZoom,
              imageWidth,
              imageHeight,
              tileSize,
              pool: new Pool(),
              isZarr: false,
              isTiff: true
            });
          }
        );
      } else {
        initZarr({ ...this.props }).then(
          ({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
            this.setState({
              connections,
              minZoom,
              imageWidth,
              imageHeight,
              tileSize,
              isZarr: true,
              isTiff: false
            });
          }
        );
      }
    }
  }

  renderLayers() {
    const { connections, pool, imageWidth, imageHeight, tileSize, minZoom } = this.state;
    const layers = connections
      ? new MicroscopyViewerLayerBase({
          connections,
          pool,
          imageWidth,
          imageHeight,
          tileSize,
          minZoom,
          maxZoom: 0,
          ...this.getSubLayerProps(this.props)
        })
      : [];
    return layers;
  }
}

MicroscopyViewerLayer.layerName = 'MicroscopyViewerLayer';
