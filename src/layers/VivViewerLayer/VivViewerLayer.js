import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import VivViewerLayerBase from './VivViewerLayerBase';
import StaticImageLayer from '../StaticImageLayer';
import { padColorsAndSliders } from '../utils';

export default class VivViewerLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      opacity,
      colormap,
      viewportId,
      onTileError,
      id
    } = this.props;
    const { tileSize, numLevels, dtype } = loader;
    const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype
    });
    const getTileData = ({ x, y, z }) => {
      return loader.getTile({
        x,
        y,
        z: -z
      });
    };
    const tiledLayer = new VivViewerLayerBase({
      id: `Tiled-Image-${id}`,
      tileSize,
      getTileData,
      dtype,
      minZoom: -(numLevels - 1),
      colorValues: paddedColorValues,
      sliderValues: paddedSliderValues,
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy: opacity === 1 ? 'best-available' : 'no-overlap',
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader]
      },
      onTileError: onTileError || loader.onTileError,
      opacity,
      domain,
      colormap,
      viewportId
    });
    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for the background if we have an opacity
    // paramteter set to anything but 1, but we always use it for situations where
    // we are zoomed out too far.
    const baseLayer = new StaticImageLayer(this.props, {
      id: `Background-Image-${id}`,
      scale: 2 ** (numLevels - 1),
      visible:
        opacity === 1 ||
        (-numLevels > this.context.viewport.zoom &&
          this.context.viewport.id === viewportId),
      z: numLevels - 1
    });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
