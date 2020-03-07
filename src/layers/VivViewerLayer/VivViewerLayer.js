import { CompositeLayer } from '@deck.gl/core';
// eslint-disable-next-line import/extensions
import VivViewerLayerBase from './VivViewerLayerBase';
import {
  padWithDefault,
  isInTileBounds,
  DEFAULT_COLOR_OFF,
  MAX_COLOR_INTENSITY
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
    const {
      sliderValues,
      colorValues,
      channelIsOn,
      maxSliderValue
    } = this.props;
    const lengths = [sliderValues.length, colorValues.length];
    if (lengths.every(l => l !== lengths[0])) {
      throw Error('Inconsistent number of slider values and colors provided');
    }

    const colors = colorValues.map((color, i) =>
      channelIsOn[i]
        ? color.map(c => c / MAX_COLOR_INTENSITY)
        : DEFAULT_COLOR_OFF
    );

    const sliders = sliderValues.map((slider, i) =>
      channelIsOn[i] ? slider : [maxSliderValue, maxSliderValue]
    );

    // Need to pad sliders and colors with default values (required by shader)
    const padSize = MAX_SLIDERS_AND_CHANNELS - colors.length;
    if (padSize < 0) {
      throw Error(`${lengths} channels passed in, but only 6 are allowed.`);
    }

    const paddedColorValues = padWithDefault(
      colors,
      DEFAULT_COLOR_OFF,
      padSize
    );
    const paddedSliderValues = padWithDefault(
      sliders,
      [maxSliderValue, maxSliderValue],
      padSize
    );
    const overrideValuesProps = {
      ...this.props,
      sliderValues: paddedSliderValues.flat(), // flatten for use on shaders
      colorValues: paddedColorValues.flat()
    };
    return overrideValuesProps;
  }

  renderLayers() {
    const { imageWidth, imageHeight, tileSize, minZoom } = this.state;

    const { loader } = this.props;
    const layerProps = this._overrideChannelProps();
    const getTileData = ({ x, y, z }) => {
      if (
        isInTileBounds({
          x,
          y,
          z: -z,
          imageWidth,
          imageHeight,
          minZoom,
          tileSize
        })
      ) {
        return loader.getTile({
          x,
          y,
          z: -z
        });
      }
      return null;
    };
    const layers = new VivViewerLayerBase({
      imageWidth,
      imageHeight,
      tileSize,
      minZoom,
      getTileData,
      ...this.getSubLayerProps(layerProps)
    });
    return layers;
  }
}

VivViewerLayer.layerName = 'VivViewerLayer';
