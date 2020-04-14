import { CompositeLayer } from '@deck.gl/core';
import VivViewerLayerBase from './VivViewerLayerBase';
import StaticImageLayer from '../StaticImageLayer';
import { padColorsAndSliders } from '../utils';

/**
 * This layer generates a VivViewerLayer (tiled) and a StaticImageLayer (background for the tiled layer)
 * @param {Array} sliderValues The list of [min, max] values for each channe to control rendering.
 * @param {Array} colorValues The list of [r, g, b] values for each channel.
 * @param {Array} channelIsOn The list of boolean values for each channel for whether or not it is visible.
 * @param {number} opacity The opacity of the layer.
 * @param {string} colormap A string indicating a colormap (default: '').
 * @param {Array} domain An override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} viewportId The id for the current view.
 * @param {Object} loader The loader to be used for fetching data.  It must implement/return `getTile`, `dtype`, `numLevels`, and `tileSize`, and `getRaster`.
 * @param {Array} loaderSelection The selection to be used for fetching data.
 * @param {String} id The unique identifier for this layer.
 * @param {String} onTileError A custom override for handle tile fetching errors.
 */

export default class VivViewerLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      loaderSelection,
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
    const getTileData = async ({ x, y, z }) => {
      const { data, width, height } = await loader.getTile({
        x,
        y,
        z: -z,
        loaderSelection
      });
      if (width !== tileSize || height !== tileSize) {
        throw Error(
          `Tile data  { width: ${width}, height: ${height} } does not match tilesize: ${tileSize}`
        );
      }
      return data;
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
        getTileData: [loader, loaderSelection]
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
          (!viewportId || this.context.viewport.id === viewportId)),
      z: numLevels - 1
    });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
