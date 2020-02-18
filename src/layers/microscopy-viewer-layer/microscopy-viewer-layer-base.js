import { BaseTileLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from 'deck.gl';
import { XRLayer } from '../xr-layer';
import { tileToScreen, getRasterTileIndices } from './tiling-utils';

import { loadZarr, loadTiff } from './data-utils';

const defaultProps = {
  ...BaseTileLayer.defaultProps,
  id: `microscopy-tile-layer`,
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  maxZoom: 0,
  onViewportLoad: false,
  renderSubLayers: props => {
    const {
      bbox: { west, south, east, north }
    } = props.tile;
    const { sliderValues, data, colorValues } = props;
    const xrl = new XRLayer(props, {
      id: `XR-Layer-${west}-${south}-${east}-${north}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data,
      sliderValues,
      colorValues,
      bounds: [west, south, east, north],
      visible: true
    });
    return xrl;
  }
};

export class MicroscopyViewerLayerBase extends BaseTileLayer {
  constructor(props) {
    const minZoom = Math.floor(
      -1 * Math.log2(Math.max(props.imageHeight, props.imageWidth))
    );
    const { sliderValues, colorValues, channelsOn } = props;
    const inputColorValues = {};
    const inputSliderValues = {};
    Object.keys(colorValues).forEach(channel => {
      const channelIsOn = channelsOn[channel];
      inputColorValues[channel] = channelIsOn
        ? colorValues[channel]
        : [0, 0, 0];
      inputSliderValues[channel] = channelIsOn
        ? sliderValues[channel]
        : [65535, 65535];
    });
    const orderedSliderValues = [];
    let orderedColorValues = [];
    Object.keys(inputSliderValues)
      .sort()
      .forEach(key => orderedSliderValues.push(inputSliderValues[key]));
    Object.keys(inputColorValues)
      .sort()
      .forEach(key => orderedColorValues.push(inputColorValues[key]));
    const diffSliders = 6 - orderedSliderValues.length;
    for (let i = 0; i < diffSliders; i += 1) {
      orderedSliderValues.push([0, 65535]);
    }
    const diffColors = 6 - orderedColorValues.length;
    for (let j = 0; j < diffColors; j += 1) {
      orderedColorValues.push([0, 0, 0]);
    }
    orderedColorValues = orderedColorValues.map(color =>
      color.map(ch => ch / 255)
    );
    // flatten for use on shaders
    // eslint-disable-next-line prefer-spread
    const flatSliderValues = [].concat(...orderedSliderValues);
    const getZarr = ({ x, y, z }) => {
      return loadZarr({
        x,
        y,
        z: -1 * z,
        ...props
      });
    };
    const getTiff = ({ x, y, z }) => {
      return loadTiff({
        x,
        y,
        z: -1 * z,
        ...props
      });
    };
    const getTileData =
      (props.useZarr && getZarr) ||
      (props.useTiff && getTiff) ||
      props.getTileData;
    const overrideValuesProps = {
      ...props,
      sliderValues: flatSliderValues,
      colorValues: orderedColorValues,
      getTileData,
      // eslint-disable-next-line no-shadow
      getTileIndices: (viewport, maxZoom, minZoom) => {
        return getRasterTileIndices({
          viewport,
          maxZoom,
          minZoom,
          ...props
        });
      },
      tileToBoundingBox: (x, y, z) => {
        return tileToScreen({
          x,
          y,
          z,
          ...props
        });
      }
    };
    const layerProps = { ...defaultProps, ...overrideValuesProps };
    super(layerProps);
  }
}

MicroscopyViewerLayerBase.layerName = 'MicroscopyViewerLayerBase';
MicroscopyViewerLayerBase.defaultProps = defaultProps;
