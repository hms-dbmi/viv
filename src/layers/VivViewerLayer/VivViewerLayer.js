import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import VivViewerLayerBase from './VivViewerLayerBase';
import { isInTileBounds } from './utils';
import { overrideChannelProps } from '../utils';

export default class VivViewerLayer extends CompositeLayer {
  // see https://github.com/uber/deck.gl/blob/master/docs/api-reference/layer.md#shouldupdatestate
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  renderLayers() {
    const { loader } = this.props;
    const { imageWidth, imageHeight, tileSize, minZoom } = loader.vivMetadata;
    const layerProps = overrideChannelProps(this.props);
    const getTileData = ({ x, y, z }) => {
      if (
        isInTileBounds({
          x,
          y,
          z: -z,
          imageWidth,
          imageHeight,
          minZoom,
          tileSize
        })
      ) {
        return loader.getTile({
          x,
          y,
          z: -z
        });
      }
      return null;
    };
    const layers = new VivViewerLayerBase({
      imageWidth,
      imageHeight,
      tileSize,
      minZoom,
      getTileData,
      ...this.getSubLayerProps(layerProps)
    });
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
