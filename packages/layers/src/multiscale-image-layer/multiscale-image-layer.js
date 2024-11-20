import { CompositeLayer } from '@deck.gl/core';
import { GL } from '@luma.gl/constants';
import { Matrix4 } from '@math.gl/core';

import { ColorPaletteExtension } from '@vivjs/extensions';
import { SIGNAL_ABORTED, getImageSize, isInterleaved } from '@vivjs/loaders';
import ImageLayer from '../image-layer';
import MultiscaleImageLayerBase from './multiscale-image-layer-base';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  onHover: { type: 'function', value: null, compare: false },
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  maxRequests: { type: 'number', value: 10, compare: true },
  onClick: { type: 'function', value: null, compare: true },
  refinementStrategy: { type: 'string', value: null, compare: true },
  excludeBackground: { type: 'boolean', value: false, compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPaletteExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader Image pyramid. PixelSource[], where each PixelSource is decreasing in shape.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onTileError Custom override for handle tile fetching errors.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {number=} maxRequests Maximum parallel ongoing requests allowed before aborting.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {string=} refinementStrategy 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
 * @property {boolean=} excludeBackground Whether to exclude the background image. The background image is also excluded for opacity!=1.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const MultiscaleImageLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      selections,
      opacity,
      viewportId,
      onTileError,
      onHover,
      id,
      onClick,
      modelMatrix,
      excludeBackground,
      refinementStrategy
    } = this.props;
    // Get properties from highest resolution
    const { tileSize, dtype } = loader[0];
    // This is basically to invert:
    // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
    // The z level can be wrong for showing the correct scales because of the calculation deck.gl does
    // so we need to invert it for fetching tiles and minZoom/maxZoom.
    const getTileData = async ({ index: { x, y, z }, signal }) => {
      // Early return if no selections
      if (!selections || selections.length === 0) {
        return null;
      }

      // I don't fully undertstand why this works, but I have a sense.
      // It's basically to cancel out:
      // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128,
      // which felt odd to me to beign with.
      // The image-tile example works without, this but I have a feeling there is something
      // going on with our pyramids and/or rendering that is different.
      const resolution = Math.round(-z);
      const getTile = selection => {
        const config = { x, y, selection, signal };
        return loader[resolution].getTile(config);
      };

      try {
        /*
         * Try to request the tile data. The pixels sources can throw
         * special SIGNAL_ABORTED string that we pick up in the catch
         * block to return null to deck.gl.
         *
         * This means that our pixels sources _always_ have the same
         * return type, and optional throw for performance.
         */
        const tiles = await Promise.all(selections.map(getTile));

        const tile = {
          data: tiles.map(d => d.data),
          width: tiles[0].width,
          height: tiles[0].height
        };

        if (isInterleaved(loader[resolution].shape)) {
          tile.data = tile.data[0];
          if (tile.data.length === tile.width * tile.height * 3) {
            // This indicates the data is RGB but it will be converted to RGBA
            tile.format = 'rgba8unorm';
          }
          // can just return early, no need  to check for webgl2
          return tile;
        }

        return tile;
      } catch (err) {
        /*
         * Signal is aborted. We handle the custom value thrown
         * by our pixel sources here and return falsy to deck.gl.
         */
        if (err === SIGNAL_ABORTED) {
          return null;
        }

        // We should propagate all other thrown values/errors
        throw err;
      }
    };

    const { height, width } = getImageSize(loader[0]);
    const tiledLayer = new MultiscaleImageLayerBase(this.props, {
      id: `Tiled-Image-${id}`,
      getTileData,
      dtype,
      tileSize,
      // If you scale a matrix up or down, that is like zooming in or out.  zoomOffset controls
      // how the zoom level you fetch tiles at is offset, allowing us to fetch higher resolution tiles
      // while at a lower "absolute" zoom level.  If you didn't use this prop, an image that is scaled
      // up would always look "low resolution" no matter the level of the image pyramid you are looking at.
      zoomOffset: Math.round(
        Math.log2(modelMatrix ? modelMatrix.getScale()[0] : 1)
      ),
      extent: [0, 0, width, height],
      // See the above note within for why the use of zoomOffset and the rounding necessary.
      minZoom: Math.round(-(loader.length - 1)),
      maxZoom: 0,
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy:
        refinementStrategy || (opacity === 1 ? 'best-available' : 'no-overlap'),
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader, selections]
      },
      onTileError: onTileError || loader[0].onTileError
    });

    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for the background if we have an opacity
    // paramteter set to anything but 1, but we always use it for situations where
    // we are zoomed out too far.
    const lowestResolution = loader[loader.length - 1];
    const implementsGetRaster =
      typeof lowestResolution.getRaster === 'function';
    const layerModelMatrix = modelMatrix ? modelMatrix.clone() : new Matrix4();
    const baseLayer =
      implementsGetRaster &&
      !excludeBackground &&
      new ImageLayer(this.props, {
        id: `Background-Image-${id}`,
        loader: lowestResolution,
        modelMatrix: layerModelMatrix.scale(2 ** (loader.length - 1)),
        visible: !viewportId || this.context.viewport.id === viewportId,
        onHover,
        onClick,
        // Background image is nicest when LINEAR in my opinion.
        interpolation: 'linear',
        onViewportLoad: null
      });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
};

MultiscaleImageLayer.layerName = 'MultiscaleImageLayer';
MultiscaleImageLayer.defaultProps = defaultProps;
export default MultiscaleImageLayer;
