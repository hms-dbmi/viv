import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import VivViewerLayerBase from './VivViewerLayerBase';
import StaticImageLayer from '../StaticImageLayer';
import { isInTileBounds } from './utils';
import { padColorsAndSliders } from '../utils';
import { ZarrLoader } from '../../loaders';

export default class VivViewerLayer extends CompositeLayer {
  // see https://github.com/uber/deck.gl/blob/master/docs/api-reference/layer.md#shouldupdatestate
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  renderLayers() {
    const {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      opacity
    } = this.props;
    const {
      imageWidth,
      imageHeight,
      tileSize,
      minZoom,
      dtype
    } = loader.vivMetadata;
    const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype
    });
    const getTileData = ({ x, y, z }) => {
      if (
        isInTileBounds({
          x,
          y,
          z: -z,
          imageWidth,
          imageHeight,
          minZoom,
          tileSize,
          opacity
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
    const tiledLayer = new VivViewerLayerBase(this.props, {
      id: `VivViewerLayerBase--${loader.type}`,
      imageWidth,
      imageHeight,
      tileSize,
      minZoom,
      getTileData,
      dtype,
      colorValues: paddedColorValues,
      sliderValues: paddedSliderValues,
      refinementStrategy: opacity === 1 ? 'best-available' : 'never'
    });
    const baseLayer = new StaticImageLayer(this.props, {
      id: `StaticImageLayer-${loader.type}`,
      scale: 2 ** (-minZoom - 1),
      imageHeight: tileSize,
      imageWidth: tileSize,
      visible: opacity === 1 || minZoom > this.context.viewport.zoom
    });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
