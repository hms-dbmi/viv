import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import { Pool } from 'geotiff/dist/geotiff.bundle.min.js';
import VivViewerLayerBase from './VivViewerLayerBase';
import { initTiff, initZarr } from './data-utils';
import {
  padWithDefault,
  setOrderedValues,
  DEFAULT_COLOR_OFF,
  DEFAULT_SLIDER_OFF
} from './utils';

const MAX_SLIDERS_AND_CHANNELS = 6;

export default class VivViewerLayer extends CompositeLayer {
  initializeState() {
    this.state = {
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
    if (this.props.loader) {
      const {
        imageWidth,
        imageHeight,
        tileSize,
        minZoom
      } = this.props.loader.vivMetadata;

      this.setState({
        minZoom,
        imageWidth,
        imageHeight,
        tileSize
      });
    }
  }

  _overrideChannelProps() {
    const { sliderValues, colorValues, channelsOn } = this.props;
    const orderedChannelNames = Object.keys(sliderValues);
    const { orderedSliderValues, orderedColorValues } = setOrderedValues(
      orderedChannelNames,
      colorValues,
      sliderValues,
      channelsOn
    );

    // Need to pad sliders and colors with default values (required by shader)
    const numChannels = orderedChannelNames.length;
    const padSize = MAX_SLIDERS_AND_CHANNELS - numChannels;
    if (padSize < 0) {
      throw Error(`${numChannels} channels passed in, but only 6 are allowed.`);
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
    const layers = this.props.loader
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
