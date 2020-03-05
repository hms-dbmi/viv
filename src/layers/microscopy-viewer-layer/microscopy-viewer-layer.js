import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import { MicroscopyViewerLayerBase } from './microscopy-viewer-layer-base';

export class MicroscopyViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      connections: null,
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
    if (this.props.loader) {
      const {
        imageWidth,
        imageHeight,
        tileSize,
        minZoom
      } = this.props.loader.vivMetadata;

      this.setState({
        minZoom,
        imageWidth,
        imageHeight,
        tileSize
      });
    }
  }

  renderLayers() {
    const { imageWidth, imageHeight, tileSize, minZoom } = this.state;
    const layers = this.props.loader
      ? new MicroscopyViewerLayerBase({
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
