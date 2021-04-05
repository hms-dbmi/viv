import { CompositeLayer } from '@deck.gl/core';
import { Matrix4 } from 'math.gl';
import GL from '@luma.gl/constants';

import MultiscaleImageLayerBase from './MultiscaleImageLayerBase';
import ImageLayer from '../ImageLayer';
import { onPointer } from '../utils';
import {
  getImageSize,
  isInterleaved,
  SIGNAL_ABORTED
} from '../../loaders/utils';

// From https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
const DECK_GL_TILE_SIZE = 512;

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  onHover: { type: 'function', value: null, compare: false },
  sliderValues: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  opacity: { type: 'number', value: 1, compare: true },
  colormap: { type: 'string', value: '', compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  isLensOn: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensRadius: { type: 'number', value: 100, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  maxRequests: { type: 'number', value: 10, compare: true },
  onClick: { type: 'function', value: null, compare: true },
  transparentColor: { type: 'array', value: null, compare: true },
  refinementStrategy: { type: 'string', value: null, compare: true },
  excludeBackground: { type: 'boolean', value: false, compare: true }
};

/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} sliderValues List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<Array.<number>>} colorValues List of [r, g, b] values for each channel.
 * @property {Array.<Array.<boolean>>} channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader Image pyramid. PixelSource[], where each PixelSource is decreasing in shape.
 * @property {Array} loaderSelection Selection to be used for fetching data.
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onTileError Custom override for handle tile fetching errors.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {boolean=} isLensOn Whether or not to use the lens.
 * @property {number=} lensSelection Numeric index of the channel to be focused on by the lens.
 * @property {number=} lensRadius Pixel radius of the lens (default: 100).
 * @property {Array.<number>=} lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @property {number=} lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @property {number=} maxRequests Maximum parallel ongoing requests allowed before aborting.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {string=} refinementStrategy 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
 * @property {boolean=} excludeBackground Whether to exclude the background image. The background image is also excluded for opacity!=1.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 */
const MultiscaleImageLayer = class extends CompositeLayer {
  initializeState() {
    this.state = {
      unprojectLensBounds: [0, 0, 0, 0]
    };
    if (this.context.deck) {
      this.context.deck.eventManager.on({
        pointermove: () => onPointer(this),
        pointerleave: () => onPointer(this),
        wheel: () => onPointer(this)
      });
    }
  }

  renderLayers() {
    const {
      loader,
      loaderSelection,
      opacity,
      viewportId,
      onTileError,
      onHover,
      id,
      onClick,
      modelMatrix,
      transparentColor,
      excludeBackground,
      refinementStrategy
    } = this.props;

    // Get properties from highest resolution
    const { tileSize, dtype } = loader[0];

    const { unprojectLensBounds } = this.state;
    // This is basically to invert:
    // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
    // The z level can be wrong for showing the correct scales because of the calculation deck.gl does
    // so we need to invert it for fetching tiles and minZoom/maxZoom.
    const zoomOffset = Math.log2(DECK_GL_TILE_SIZE / tileSize);
    const getTileData = async ({ x, y, z, signal }) => {
      // Early return if no loaderSelection
      if (!loaderSelection || loaderSelection.length === 0) {
        return null;
      }

      // I don't fully undertstand why this works, but I have a sense.
      // It's basically to cancel out:
      // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128,
      // which felt odd to me to beign with.
      // The image-tile example works without, this but I have a feeling there is something
      // going on with our pyramids and/or rendering that is different.
      const resolution = Math.round(-z + zoomOffset);
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
        const tiles = await Promise.all(loaderSelection.map(getTile));

        const tile = {
          data: tiles.map(d => d.data),
          width: tiles[0].width,
          height: tiles[0].height
        };

        if (isInterleaved(loader[resolution].shape)) {
          // eslint-disable-next-line prefer-destructuring
          tile.data = tile.data[0];
          if (tile.data.length === tile.width * tile.height * 3) {
            tile.format = GL.RGB;
            tile.dataFormat = GL.RGB; // is this not properly inferred?
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
      // If you scale a matrix up or down, that is like zooming in or out.  After
      // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128,
      // tileSize controls the zoom level that the tile indexer thinks you are at for fetching tiles.
      // Because the indexing offsets `z` by math.log2(TILE_SIZE / tileSize), passing in
      // tileSize * (1 / modelMatrix.getScale()[0]) from this layer as below to TileLayer gives an offset of
      // math.log2(TILE_SIZE / (tileSize * (1 / modelMatrix.getScale()[0]))) = math.log2(TILE_SIZE / tileSize) + Math.log2(modelMatrix.getScale()[0])
      // as desired so that the z level used for indexing the tiles is larger (i.e more zoomed in) if the image is scaled larger, and vice-versa if scaled smaller.
      tileSize: modelMatrix
        ? tileSize * (1 / modelMatrix.getScale()[0])
        : tileSize,
      extent: [0, 0, width, height],
      // See the above note within for why the use of zoomOffset and the rounding necessary.
      minZoom: Math.round(-(loader.length - 1) + zoomOffset),
      maxZoom: Math.round(zoomOffset),
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy:
        refinementStrategy || (opacity === 1 ? 'best-available' : 'no-overlap'),
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader, loaderSelection]
      },
      onTileError: onTileError || loader[0].onTileError,
      unprojectLensBounds
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
        visible:
          opacity === 1 &&
          (!viewportId || this.context.viewport.id === viewportId) &&
          // If we are using a transparent color, we shouldn't show the background image
          // since the background image might not have the same color output from the fragment shader
          // as the tiled layer at a higher resolution level.
          !transparentColor,
        pickable: { type: 'boolean', value: true, compare: true },
        onHover,
        onClick
      });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
};

MultiscaleImageLayer.layerName = 'MultiscaleImageLayer';
MultiscaleImageLayer.defaultProps = defaultProps;
export default MultiscaleImageLayer;
