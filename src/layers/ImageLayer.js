import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { isWebGL2 } from '@luma.gl/core';
import GL from '@luma.gl/constants';

import XRLayer from './XRLayer';
import BitmapLayer from './BitmapLayer';
import { to32BitFloat, onPointer } from './utils';

const defaultProps = {
  pickable: true,
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
      dtype: '<u2'
    },
    compare: true
  },
  z: { type: 'number', value: 0, compare: true },
  isLensOn: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensRadius: { type: 'number', value: 100, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  onClick: { type: 'function', value: null, compare: true }
};

/**
 * This layer wraps XRLayer and generates a static image
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {number} props.opacity Opacity of the layer.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} props.viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @param {Object} props.loader Loader to be used for fetching data.  It must implement/return `getRaster` and `dtype`.
 * @param {String} props.onHover Hook function from deck.gl to handle hover objects.
 * @param {boolean} props.isLensOn Whether or not to use the lens.
 * @param {number} props.lensSelection Numeric index of the channel to be focused on by the lens.
 * @param {number} props.lensRadius Pixel radius of the lens (default: 100).
 * @param {number} props.lensBorderColor RGB color of the border of the lens.
 * @param {number} props.lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @param {number} props.onClick Hook function from deck.gl to handle clicked-on objects.
 * @param {number} props.modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 */
export default class ImageLayer extends CompositeLayer {
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
      const { loader, z, loaderSelection } = this.props;
      loader.getRaster({ z, loaderSelection }).then(raster => {
        /* eslint-disable no-param-reassign */
        if (loader.isInterleaved && loader.isRgb) {
          // data is for BitmapLayer and needs to be of form { data: Uint8Array, width, height };
          // eslint-disable-next-line prefer-destructuring
          raster.data = raster.data[0];
          if (raster.data.length === raster.width * raster.height * 3) {
            // data is RGB (not RGBA) and need to update texture formats
            raster.format = GL.RGB;
            raster.dataFormat = GL.RGB;
          }
        } else if (!isWebGL2(this.context.gl)) {
          // data is for XLRLayer in non-WebGL2 evironment
          // we need to convert data to compatible textures
          raster.data = to32BitFloat(raster.data);
        }
        this.setState({ ...raster });
        /* eslint-disable no-param-reassign */
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
    const {
      loader,
      visible,
      opacity,
      colormap,
      sliderValues,
      colorValues,
      channelIsOn,
      z,
      domain,
      pickable,
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensRadius,
      id,
      onClick,
      onHover,
      modelMatrix
    } = this.props;
    const { dtype } = loader;
    const { width, height, data, unprojectLensBounds } = this.state;
    if (!(width && height)) return null;
    const bounds = [0, height, width, 0];
    const { isRgb, isInterleaved, photometricInterpretation } = loader;
    if (isRgb && isInterleaved) {
      return new BitmapLayer(this.props, {
        image: this.state,
        photometricInterpretation,
        // Shared props with XRLayer:
        bounds,
        id: `image-sub-layer-${bounds}-${id}-${z}`,
        onHover,
        pickable,
        onClick,
        modelMatrix,
        opacity,
        visible
      });
    }
    return new XRLayer(this.props, {
      channelData: { data, height, width },
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype,
      colormap,
      unprojectLensBounds,
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensRadius,
      // Shared props with BitmapLayer:
      bounds,
      id: `image-sub-layer-${bounds}-${id}-${z}`,
      onHover,
      pickable,
      onClick,
      modelMatrix,
      opacity,
      visible
    });
  }
}

ImageLayer.layerName = 'ImageLayer';
ImageLayer.defaultProps = defaultProps;
