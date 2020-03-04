import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import { Pool } from 'geotiff/dist/geotiff.bundle.min.js';
import { VivViewerLayerBase } from './viv-viewer-layer-base';
import { initTiff, initZarr } from './data-utils';
import {
  inTileBounds,
  cutOffImageBounds,
  padWithDefault,
  setOrderedValues,
  DEFAULT_COLOR_OFF,
  DEFAULT_SLIDER_OFF
} from './utils';

const MAX_SLIDERS_AND_CHANNELS = 6;

export class VivViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      connections: null,
      pool: null,
      isZarr: false,
      isTiff: false,
      imageWidth: 0,
      imageHeight: 0,
      tileSize: 0,
      minZoom: 0
    };
  }

  // see https://github.com/uber/deck.gl/blob/master/docs/api-reference/layer.md#shouldupdatestate
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.somethingChanged;
  }

  updateState() {
    /* eslint-disable no-bitwise */
    if (
      !this.state.connections ||
      this.props.useTiff ^ this.state.isTiff ||
      this.props.useZarr ^ this.state.isZarr
    ) {
      /* eslint-disable no-bitwise */
      if (this.props.useTiff) {
        initTiff({ ...this.props }).then(
          ({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
            this.setState({
              connections,
              minZoom,
              imageWidth,
              imageHeight,
              tileSize,
              pool: new Pool(),
              isZarr: false,
              isTiff: true
            });
          }
        );
      } else {
        initZarr({ ...this.props }).then(
          ({ connections, minZoom, imageWidth, imageHeight, tileSize }) => {
            this.setState({
              connections,
              minZoom,
              imageWidth,
              imageHeight,
              tileSize,
              isZarr: true,
              isTiff: false
            });
          }
        );
      }
    }
  }

  _overrideChannelProps() {
    const {
      sliderValues,
      colorValues,
      channelsOn,
      useZarr,
      useTiff
    } = this.props;
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
    const overrideValuesProps = {
      ...this.props,
      sliderValues: paddedSliderValues.flat(), // flatten for use on shaders
      colorValues: paddedColorValues
    };
    return overrideValuesProps;
  }

  renderLayers() {
    const {
      connections,
      pool,
      imageWidth,
      imageHeight,
      tileSize,
      minZoom
    } = this.state;

    const layerProps = this._overrideChannelProps();
    const layers = connections
      ? new VivViewerLayerBase({
          connections,
          pool,
          imageWidth,
          imageHeight,
          tileSize,
          minZoom,
          maxZoom: 0,
          ...this.getSubLayerProps(layerProps)
        })
      : [];
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
