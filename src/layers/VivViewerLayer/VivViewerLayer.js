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
      refinementStrategy: opacity === 1 ? 'best-available' : 'never',
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader]
      }
    });
    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for backgruond if we have an opacity
    // paramteter set to anything but 1, but we always use it for minZoom situations.
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
