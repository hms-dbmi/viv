import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import GL from '@luma.gl/constants';

import XRLayer from './XRLayer';
import BitmapLayer from './BitmapLayer';
import { onPointer } from './utils';
import { isInterleaved } from '../loaders/utils';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  loaderSelection: { type: 'array', value: [], compare: true },
  colormap: { type: 'string', value: '', compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      dtype: 'Uint16'
    },
    compare: true
  },
  isLensOn: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensRadius: { type: 'number', value: 100, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  onClick: { type: 'function', value: null, compare: true },
  transparentColor: { type: 'array', value: null, compare: true },
  onViewportLoad: { type: 'function', value: null, compare: true }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} sliderValues List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<Array.<number>>} colorValues List of [r, g, b] values for each channel.
 * @property {Array.<Array.<boolean>>} channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource. Represents an N-dimensional image.
 * @property {Array} loaderSelection Selection to be used for fetching data.
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {boolean=} isLensOn Whether or not to use the lens.
 * @property {number=} lensSelection Numeric index of the channel to be focused on by the lens.
 * @property {number=} lensRadius Pixel radius of the lens (default: 100).
 * @property {Array.<number>=} lensBorderColor RGB color of the border of the lens.
 * @property {number=} lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {String=} id Unique identifier for this layer.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 */
const ImageLayer = class extends CompositeLayer {
  initializeState() {
    this.state = {
      unprojectLensBounds: [0, 0, 0, 0],
      width: 0,
      height: 0,
      data: []
    };
    if (this.context.deck) {
      this.context.deck.eventManager.on({
        pointermove: () => onPointer(this),
        pointerleave: () => onPointer(this),
        wheel: () => onPointer(this)
      });
    }
  }

  updateState({ changeFlags, props, oldProps }) {
    const { propsChanged } = changeFlags;
    const loaderChanged =
      typeof propsChanged === 'string' && propsChanged.includes('props.loader');
    const loaderSelectionChanged =
      props.loaderSelection !== oldProps.loaderSelection;

    if (loaderChanged || loaderSelectionChanged) {
      // Only fetch new data to render if loader has changed
      const { loader, loaderSelection = [], onViewportLoad } = this.props;
      const getRaster = selection => loader.getRaster({ selection });
      const dataPromises = loaderSelection.map(getRaster);

      Promise.all(dataPromises).then(rasters => {
        const raster = {
          data: rasters.map(d => d.data),
          width: rasters[0].width,
          height: rasters[0].height
        };

        if (isInterleaved(loader.shape)) {
          // data is for BitmapLayer and needs to be of form { data: Uint8Array, width, height };
          // eslint-disable-next-line prefer-destructuring
          raster.data = raster.data[0];
          if (raster.data.length === raster.width * raster.height * 3) {
            // data is RGB (not RGBA) and need to update texture formats
            raster.format = GL.RGB;
            raster.dataFormat = GL.RGB;
          }
        }

        if (onViewportLoad) {
          onViewportLoad(raster);
        }
        this.setState({ ...raster });
      });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getPickingInfo({ info, sourceLayer }) {
    // eslint-disable-next-line no-param-reassign
    info.sourceLayer = sourceLayer;
    // eslint-disable-next-line no-param-reassign
    info.tile = sourceLayer.props.tile;
    return info;
  }

  renderLayers() {
    const { loader, id } = this.props;
    const { dtype } = loader;
    const { width, height, data } = this.state;
    if (!(width && height)) return null;

    const bounds = [0, height, width, 0];
    if (isInterleaved(loader.shape)) {
      const { photometricInterpretation = 2 } = loader.meta;
      return new BitmapLayer(this.props, {
        image: this.state,
        photometricInterpretation,
        // Shared props with XRLayer:
        bounds,
        id: `image-sub-layer-${bounds}-${id}`
      });
    }
    return new XRLayer(this.props, {
      channelData: { data, height, width },
      // Shared props with BitmapLayer:
      bounds,
      id: `image-sub-layer-${bounds}-${id}`,
      dtype
    });
  }
};

ImageLayer.layerName = 'ImageLayer';
ImageLayer.defaultProps = defaultProps;
export default ImageLayer;
