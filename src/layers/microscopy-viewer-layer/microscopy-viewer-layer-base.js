import {TileLayer} from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from 'deck.gl';
import { XRLayer } from '../xr-layer';

import { loadZarr, loadTiff } from './data-utils';
import {
  padWithDefault,
  setOrderedValues,
  DEFAULT_COLOR_OFF,
  DEFAULT_SLIDER_OFF
} from './utils';

const MAX_SLIDERS_AND_CHANNELS = 6;

const defaultProps = {
  ...TileLayer.defaultProps,
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  maxZoom: 0,
  onViewportLoad: false,
  onTileError: (e) => {},
  onTileLoad: (e) => {},
  renderSubLayers: props => {
    const {
      bbox: {left, top, right, bottom}
    } = props.tile;
    const inBounds = left >= 0 && right >= 0 && top >= 0 && bottom >= 0
    const { sliderValues, data, colorValues } = props;
    const xrl = data && inBounds && new XRLayer(props, {
      id: `XR-Layer-${left}-${top}-${right}-${bottom}-${props.useTiff}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data,
      sliderValues,
      colorValues,
      bounds: [left, bottom, right, top],
      visible: true
    });
    return xrl;
  }
};

export class MicroscopyViewerLayerBase extends TileLayer {
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
      getTileData
    };
    const layerProps = { ...defaultProps, ...overrideValuesProps };
    super(layerProps);
  }
}

MicroscopyViewerLayerBase.layerName = 'MicroscopyViewerLayerBase';
MicroscopyViewerLayerBase.defaultProps = defaultProps;
