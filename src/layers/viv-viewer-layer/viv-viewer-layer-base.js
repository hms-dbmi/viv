import { TileLayer } from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { XRLayer } from '../xr-layer';

import { loadZarr, loadTiff } from './data-utils';
import {
  inTileBounds,
  cutOffImageBounds,
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
  onTileError: e => console.error(e),
  onTileLoad: () => {},
  sliderValues: [],
  colorValues: [],
  renderSubLayers: props => {
    const {
      bbox: { left, top, right, bottom }
    } = props.tile;
    const {
      imageWidth,
      imageHeight,
      colorValues,
      sliderValues,
      data,
      useZarr
    } = props;
    const cutOffBounds = cutOffImageBounds({
      left,
      bottom,
      right,
      top,
      imageWidth,
      imageHeight
    });
    const xrl =
      data &&
      new XRLayer(props, {
        id: `XR-Layer-${cutOffBounds.left}-${cutOffBounds.top}-${cutOffBounds.right}-${cutOffBounds.bottom}-${useZarr}`,
        pickable: false,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data,
        sliderValues,
        colorValues,
        bounds: [
          cutOffBounds.left,
          cutOffBounds.bottom,
          cutOffBounds.right,
          cutOffBounds.top
        ],
        visible: true
      });
    return xrl;
  }
};

export class VivViewerLayerBase extends TileLayer {
  constructor(props) {
    const { sliderValues, colorValues, channelsOn, useZarr, useTiff } = props;
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
      if (
        inTileBounds({
          x,
          y,
          z: -z,
          ...props
        })
      ) {
        return loadZarr({
          x,
          y,
          z: -1 * z,
          ...props
        });
      }
      return null;
    };
    const getTiff = ({ x, y, z }) => {
      if (
        inTileBounds({
          x,
          y,
          z: -z,
          ...props
        })
      ) {
        return loadTiff({
          x,
          y,
          z: -1 * z,
          ...props
        });
      }
      return null;
    };
    const getTileData =
      (useZarr && getZarr) || (useTiff && getTiff) || props.getTileData;
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

VivViewerLayerBase.layerName = 'VivViewerLayerBase';
VivViewerLayerBase.defaultProps = defaultProps;
