import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import GL from '@luma.gl/constants';

import XRLayer from './XRLayer';
import BitmapLayer from './BitmapLayer';
import { onPointer } from './utils';
import { isInterleaved } from '../loaders/utils';

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
 * This layer wraps XRLayer and generates a static image
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {number} props.opacity Opacity of the layer.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} props.viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @param {Object} props.loader PixelSource. Represents an N-dimensional image.
 * @param {function} props.onHover Hook function from deck.gl to handle hover objects.
 * @param {boolean} props.isLensOn Whether or not to use the lens.
 * @param {number} props.lensSelection Numeric index of the channel to be focused on by the lens.
 * @param {number} props.lensRadius Pixel radius of the lens (default: 100).
 * @param {Array} props.lensBorderColor RGB color of the border of the lens.
 * @param {number} props.lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @param {function} props.onClick Hook function from deck.gl to handle clicked-on objects.
 * @param {Object} props.modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @param {Array} props.transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {function} props.onViewportLoad Function that gets called when the data in the viewport loads.
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
      const { loader, loaderSelection = [], onViewportLoad } = this.props;
      const getRaster = selection => loader.getRaster({ selection });
      const dataPromises = loaderSelection.map(getRaster);

      Promise.all(dataPromises).then(rasters => {
        const raster = {
          data: rasters.map(d => d.data),
          width: rasters[0].width,
          height: rasters[0].height
        };

        if (isInterleaved(loader)) {
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
    const {
      loader,
      visible,
      opacity,
      colormap,
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      pickable,
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensRadius,
      id,
      onClick,
      onHover,
      modelMatrix,
      transparentColor
    } = this.props;
    const { dtype, photometricInterpretation } = loader;
    const { width, height, data, unprojectLensBounds } = this.state;
    if (!(width && height)) return null;

    const bounds = [0, height, width, 0];
    if (isInterleaved(loader)) {
      return new BitmapLayer(this.props, {
        image: this.state,
        photometricInterpretation,
        // Shared props with XRLayer:
        bounds,
        id: `image-sub-layer-${bounds}-${id}`,
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
      id: `image-sub-layer-${bounds}-${id}`,
      onHover,
      pickable,
      onClick,
      modelMatrix,
      opacity,
      visible,
      transparentColor
    });
  }
}

ImageLayer.layerName = 'ImageLayer';
ImageLayer.defaultProps = defaultProps;
