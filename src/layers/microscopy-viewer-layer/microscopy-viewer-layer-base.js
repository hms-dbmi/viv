import { BaseTileLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { XRLayer } from '../xr-layer';
import { tileToScreen, getRasterTileIndices } from './tiling-utils';

import { loadZarr, loadTiff } from './data-utils';
import {
  padWithDefault,
  setOrderedValues,
  DEFAULT_COLOR_OFF,
  DEFAULT_SLIDER_OFF
} from './utils';

const MAX_SLIDERS_AND_CHANNELS = 6;

const defaultProps = {
  ...BaseTileLayer.defaultProps,
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
      id: `XR-Layer-${west}-${south}-${east}-${north}-${props.useTiff}`,
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
    const { sliderValues, colorValues, channelsOn } = props;
    const orderedChannelNames = Object.keys(sliderValues);
    const { orderedSliderValues, orderedColorValues } = setOrderedValues(
      orderedChannelNames,
      colorValues,
      sliderValues,
      channelsOn
    );

    // Need to pad sliders and colors with default values (required by shader)
    const padSize = MAX_SLIDERS_AND_CHANNELS - orderedChannelNames.length;
    if (padSize < 0) {
      throw Error('Too many channels specified for shader.');
    }
    const paddedSliderValues = padWithDefault(
      orderedSliderValues,
      DEFAULT_SLIDER_OFF,
      padSize
    );
    const paddedColorValues = padWithDefault(
      orderedColorValues,
      DEFAULT_COLOR_OFF,
      padSize
    );

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
      sliderValues: paddedSliderValues.flat(), // flatten for use on shaders
      colorValues: paddedColorValues,
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
