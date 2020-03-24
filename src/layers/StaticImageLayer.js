import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import XRLayer from './XRLayer';

import { padColorsAndSliders } from './utils';

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  colormap: { type: 'string', value: '', compare: true },
  domain: { type: 'array', value: [], compare: true },
  translate: { type: 'array', value: [0, 0], compare: true },
  scale: { type: 'number', value: 1, compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: () => [],
      vivMetadata: { imageHeight: 0, imageWidth: 0, dtype: '<u2' }
    },
    compare: true
  }
};

function scaleBounds({ imageWidth, imageHeight, translate, scale }) {
  const [left, top] = translate;
  const right = imageWidth * scale + left;
  const bottom = imageHeight * scale + top;
  return [left, bottom, right, top];
}

export default class StaticImageLayer extends CompositeLayer {
  initializeState() {
    const { loader } = this.props;
    this.setState({
      data: loader.getRaster({ z: 0 })
    });
  }

  updateState({ changeFlags }) {
    const { propsChanged } = changeFlags;
    if (
      typeof propsChanged === 'string' &&
      propsChanged.includes('props.loader')
    ) {
      // Only fetch new data to render if loader has changed
      const { loader } = this.props;
      this.setState({ data: loader.getRaster({ z: 0 }) });
    }
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
      translate,
      scale,
      domain
    } = this.props;
    const { imageWidth, imageHeight, dtype } = loader.vivMetadata;
    const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype
    });
    const bounds = scaleBounds({
      imageWidth,
      imageHeight,
      translate,
      scale
    });
    const { data } = this.state;
    return new XRLayer({
      channelData: data,
      bounds,
      sliderValues: paddedSliderValues,
      colorValues: paddedColorValues,
      staticImageHeight: imageHeight,
      staticImageWidth: imageWidth,
      id: `XR-Static-Layer-${0}-${imageHeight}-${imageWidth}-${0}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      opacity,
      visible,
      dtype,
      colormap
    });
  }
}

StaticImageLayer.layerName = 'StaticImageLayer';
StaticImageLayer.defaultProps = defaultProps;
