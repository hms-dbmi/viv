import { BaseTileLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { ValueError } from 'zarr';
import { XRLayer } from '../xr-layer';
import { tileToScreen, getRasterTileIndices } from './tiling-utils';

import { loadZarr, loadTiff } from './data-utils';
import { padWithDefault } from './utils';

const MAX_SLIDERS_AND_CHANNELS = 6;
const MAX_SLIDER_VALUE = 65535;
const MAX_COLOR_INTENSITY = 255;
const DEFAULT_SLIDER_OFF = [MAX_SLIDER_VALUE, MAX_SLIDER_VALUE];
const DEFAULT_COLOR_OFF = [0, 0, 0];

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

    const lengths = [sliderValues.length, colorValues.length];
    if (lengths.every(l => l !== lengths[0])) {
      throw ValueError("Inconsistent number of slider values and colors provided");
    }

    const colors = colorValues.map((color, i) =>
      channelsOn[i] ? color.map(c => c / MAX_COLOR_INTENSITY) : DEFAULT_COLOR_OFF
    );

    const sliders = sliderValues.map((slider, i) =>
      channelsOn[i] ? slider : DEFAULT_SLIDER_OFF
    );

    // Need to pad sliders and colors with default values (required by shader)
    const padSize = MAX_SLIDERS_AND_CHANNELS - colors.length;
    if (padSize < 0) {
      throw Error('Too many channels specified for shader.');
    }
    const paddedSliderValues = padWithDefault(
      sliders,
      DEFAULT_SLIDER_OFF,
      padSize
    );
    const paddedColorValues = padWithDefault(
      colors,
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
