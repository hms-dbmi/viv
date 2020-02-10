import { CompositeLayer } from '@deck.gl/core';
import { Pool } from 'geotiff/dist/geotiff.bundle.min.js';
import { MicroscopyViewerLayerBase } from './microscopy-viewer-layer-base';
import { getTiffConnections, getZarrConnections } from './data-utils';

export class MicroscopyViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      connections: null,
      pool: null
    };
  }

  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  updateState() {
    if (!this.state.connections) {
      if (this.props.useTiff) {
        getTiffConnections({ ...this.props }).then(connections => {
          this.setState({ connections, pool: new Pool() });
        });
      } else {
        getZarrConnections({ ...this.props }).then(connections => {
          this.setState({ connections });
        });
      }
    }
  }

  renderLayers() {
    const layers = this.state.connections
      ? new MicroscopyViewerLayerBase({
          connections: Object.assign({}, ...this.state.connections),
          pool: this.state.pool,
          ...this.props
        })
      : [];
    return layers;
  }
}

MicroscopyViewerLayer.layerName = 'MicroscopyViewerLayer';
