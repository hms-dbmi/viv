import { CompositeLayer } from '@deck.gl/core';
import VivViewerLayerBase from './VivViewerLayerBase';
import StaticImageLayer from '../StaticImageLayer';
import { padColorsAndSliders } from '../utils';

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
    const {
      tileSize,
      numLevels,
      dtype,
      width,
      height,
      isBioFormats6Pyramid
    } = loader;
    const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype
    });
    const getTileData = async ({ x, y, z }) => {
      const tile = await loader.getTile({
        x,
        y,
        z: -z,
        loaderSelection
      });
      if (tile) {
        if (tile.width !== tileSize || tile.height !== tileSize) {
          console.warn(
            `Tile data  { width: ${tile.width}, height: ${tile.height} } does not match tilesize: ${tileSize}`
          );
        }
      }
      return tile;
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
      viewportId,
      onHover,
      pickable,
      width,
      height,
      // Needed for misreported metadata.
      isBioFormats6Pyramid
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
