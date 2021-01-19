import { CompositeLayer } from '@deck.gl/core';
import { isWebGL2 } from '@luma.gl/core';
import { Matrix4 } from 'math.gl';
import GL from '@luma.gl/constants';

import MultiscaleImageLayerBase from './MultiscaleImageLayerBase';
import ImageLayer from '../ImageLayer';
import { to32BitFloat, onPointer } from '../utils';

// From https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
const DECK_GL_TILE_SIZE = 512;

const defaultProps = {
  pickable: true,
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
 * This layer generates a MultiscaleImageLayer (tiled) and a ImageLayer (background for the tiled layer)
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {number} props.opacity Opacity of the layer.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} props.viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @param {Object} props.loader Loader to be used for fetching data.  It must implement/return `getTile`, `dtype`, `numLevels`, and `tileSize`, and `getRaster`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {String} props.id Unique identifier for this layer.
 * @param {function} props.onTileError Custom override for handle tile fetching errors.
 * @param {function} props.onHover Hook function from deck.gl to handle hover objects.
 * @param {boolean} props.isLensOn Whether or not to use the lens.
 * @param {number} props.lensSelection Numeric index of the channel to be focused on by the lens.
 * @param {number} props.lensRadius Pixel radius of the lens (default: 100).
 * @param {Array} props.lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} props.lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @param {number} props.maxRequests Maximum parallel ongoing requests allowed before aborting.
 * @param {function} props.onClick Hook function from deck.gl to handle clicked-on objects.
 * @param {Object} props.modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @param {Array} props.transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {string} props.refinementStrategy 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
 * @param {boolean} props.excludeBackground Whether to exclude the background image. The background image is also excluded for opacity!=1.
 */

export default class MultiscaleImageLayer extends CompositeLayer {
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
      id,
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensBorderRadius,
      maxRequests,
      onClick,
      modelMatrix,
      transparentColor,
      excludeBackground,
      onViewportLoad,
      refinementStrategy
    } = this.props;
    const { tileSize, numLevels, dtype, isInterleaved, isRgb } = loader;
    const { unprojectLensBounds } = this.state;
    // This is basically to invert:
    // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
    // The z level can be wrong for showing the correct scales because of the calculation deck.gl does
    // so we need to invert it for fetching tiles and minZoom/maxZoom.
    const zoomOffset = Math.log2(DECK_GL_TILE_SIZE / tileSize);
    const noWebGl2 = !isWebGL2(this.context.gl);
    const getTileData = async ({ x, y, z, signal }) => {
      const tile = await loader.getTile({
        x,
        y,
        // See the above note within for why the use of zoomOffset and the rounding necessary.
        z: Math.round(-z + zoomOffset),
        loaderSelection,
        signal
      });
      if (isInterleaved && isRgb) {
        // eslint-disable-next-line prefer-destructuring
        tile.data = tile.data[0];
        if (tile.data.length === tile.width * tile.height * 3) {
          tile.format = GL.RGB;
          tile.dataFormat = GL.RGB; // is this not properly inferred?
        }
        // can just return early, no need  to check for webgl2
        return tile;
      }
      if (noWebGl2) {
        tile.data = to32BitFloat(tile.data);
      }
      return tile;
    };
    const { height, width } = loader.getRasterSize({ z: 0 });
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
      onClick,
      extent: [0, 0, width, height],
      // See the above note within for why the use of zoomOffset and the rounding necessary.
      minZoom: Math.round(-(numLevels - 1) + zoomOffset),
      maxZoom: Math.round(zoomOffset),
      colorValues,
      sliderValues,
      channelIsOn,
      maxRequests,
      domain,
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
      onTileError: onTileError || loader.onTileError,
      opacity,
      colormap,
      viewportId,
      onHover,
      pickable,
      unprojectLensBounds,
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensBorderRadius,
      modelMatrix,
      transparentColor,
      onViewportLoad
    });
    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for the background if we have an opacity
    // paramteter set to anything but 1, but we always use it for situations where
    // we are zoomed out too far.
    const implementsGetRaster = typeof loader.getRaster === 'function';
    const layerModelMatrix = modelMatrix ? modelMatrix.clone() : new Matrix4();
    const baseLayer =
      implementsGetRaster &&
      !excludeBackground &&
      new ImageLayer(this.props, {
        id: `Background-Image-${id}`,
        modelMatrix: layerModelMatrix.scale(2 ** (numLevels - 1)),
        visible:
          opacity === 1 &&
          (!viewportId || this.context.viewport.id === viewportId) &&
          // If we are using a transparent color, we shouldn't show the background image
          // since the background image might not have the same color output from the fragment shader
          // as the tiled layer at a higher resolution level.
          !transparentColor,
        z: numLevels - 1,
        pickable: true,
        onHover,
        onClick
      });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
}

MultiscaleImageLayer.layerName = 'MultiscaleImageLayer';
MultiscaleImageLayer.defaultProps = defaultProps;
