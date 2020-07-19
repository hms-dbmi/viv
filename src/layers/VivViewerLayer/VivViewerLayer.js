import { CompositeLayer } from '@deck.gl/core';
import { isWebGL2 } from '@luma.gl/core';

import VivViewerLayerBase from './VivViewerLayerBase';
import StaticImageLayer from '../StaticImageLayer';
import { to32BitFloat } from '../utils';

const defaultProps = {
  pickable: true,
  onHover: { type: 'function', value: null, compare: false }
};

/**
 * This layer generates a VivViewerLayer (tiled) and a StaticImageLayer (background for the tiled layer)
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {number} props.opacity Opacity of the layer.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} props.viewportId Id for the current view.
 * @param {Object} props.loader Loader to be used for fetching data.  It must implement/return `getTile`, `dtype`, `numLevels`, and `tileSize`, and `getRaster`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {String} props.id Unique identifier for this layer.
 * @param {String} props.onTileError Custom override for handle tile fetching errors.
 * @param {String} props.onHover Hook function from deck.gl to handle hover objects.
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
      onHover,
      pickable,
      id
    } = this.props;
    const { tileSize, numLevels, dtype } = loader;
    const noWebGl2 = !isWebGL2(this.context.gl);
    const getTileData = async ({ x, y, z }) => {
      const tile = await loader.getTile({
        x,
        y,
        // I don't fully undertstand why this works, but I have a sense.
        // It's basically to cancel out:
        // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128,
        // which felt odd to me to beign with.
        // The image-tile example works without, this but I have a feeling there is something
        // going on with our pyramids and/or rendering that is different.
        z: Math.round(-z + Math.log2(512 / tileSize)),
        loaderSelection
      });
      if (tile) {
        tile.data = noWebGl2 ? to32BitFloat(tile.data) : tile.data;
        if (tile.width !== tileSize || tile.height !== tileSize) {
          console.warn(
            `Tile data  { width: ${tile.width}, height: ${tile.height} } does not match tilesize: ${tileSize}`
          );
        }
      }
      return tile;
    };
    const { height, width } = loader.getRasterSize({ z: 0 });
    const tiledLayer = new VivViewerLayerBase({
      id: `Tiled-Image-${id}`,
      getTileData,
      dtype,
      tileSize,
      extent: [0, 0, width, height],
      minZoom: -(numLevels - 1),
      maxZoom: Math.min(0, Math.round(Math.log2(512 / tileSize))),
      colorValues,
      sliderValues,
      channelIsOn,
      domain,
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
      colormap,
      viewportId,
      onHover,
      pickable
    });
    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for the background if we have an opacity
    // paramteter set to anything but 1, but we always use it for situations where
    // we are zoomed out too far.
    const implementsGetRaster = typeof loader.getRaster === 'function';
    const baseLayer =
      implementsGetRaster &&
      new StaticImageLayer(this.props, {
        id: `Background-Image-${id}`,
        scale: 2 ** (numLevels - 1),
        visible:
          opacity === 1 ||
          (-numLevels > this.context.viewport.zoom &&
            (!viewportId || this.context.viewport.id === viewportId)),
        z: numLevels - 1,
        pickable: true,
        onHover
      });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
VivViewerLayer.defaultProps = defaultProps;
