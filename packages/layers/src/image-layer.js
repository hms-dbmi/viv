import { COORDINATE_SYSTEM, CompositeLayer } from '@deck.gl/core';
import { GL } from '@luma.gl/constants';

import { ColorPaletteExtension } from '@vivjs/extensions';
import { SIGNAL_ABORTED, isInterleaved } from '@vivjs/loaders';
import BitmapLayer from './bitmap-layer';
import XRLayer from './xr-layer/xr-layer';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  selections: { type: 'array', value: [], compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      dtype: 'Uint16',
      shape: []
    },
    compare: true
  },
  onClick: { type: 'function', value: null, compare: true },
  onViewportLoad: { type: 'function', value: null, compare: true },
  interpolation: {
    type: 'number',
    value: 'nearest',
    compare: true
  },
  extensions: {
    type: 'array',
    value: [new ColorPaletteExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Object} loader PixelSource. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const ImageLayer = class extends CompositeLayer {
  finalizeState() {
    this.state.abortController.abort();
  }

  updateState({ props, oldProps }) {
    const loaderChanged = props.loader !== oldProps.loader;
    const selectionsChanged = props.selections !== oldProps.selections;

    if (loaderChanged || selectionsChanged) {
      // Only fetch new data to render if loader has changed
      const { loader, selections = [], onViewportLoad } = this.props;
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const getRaster = selection => loader.getRaster({ selection, signal });
      const dataPromises = selections.map(getRaster);

      Promise.all(dataPromises)
        .then(rasters => {
          const raster = {
            data: rasters.map(d => d.data),
            width: rasters[0]?.width,
            height: rasters[0]?.height
          };

          if (isInterleaved(loader.shape)) {
            // data is for BitmapLayer and needs to be of form { data: Uint8Array, width, height };
            raster.data = raster.data[0];
            if (raster.data.length === raster.width * raster.height * 3) {
              // Previously there was a rgb format, but now we only convert to rgba in BitmapLater
              raster.format = 'rgba8unorm';
            }
          }

          if (onViewportLoad) {
            onViewportLoad(raster);
          }
          this.setState({ ...raster });
        })
        .catch(e => {
          if (e !== SIGNAL_ABORTED) {
            throw e; // re-throws error if not our signal
          }
        });
    }
  }

  getPickingInfo({ info, sourceLayer }) {
    info.sourceLayer = sourceLayer;
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
        id: `image-sub-layer-${bounds}-${id}`,
        extensions: []
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
