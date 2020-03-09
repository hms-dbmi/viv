import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import XRLayer from './XRLayer';

import { overrideChannelProps } from './utils';

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  colormap: { type: 'string', value: '', compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: () => [],
      vivMetadata: { imageHeight: 0, imageWidth: 0 }
    },
    compare: true
  }
};

export default class StaticImageLayer extends CompositeLayer {
  initializeState() {
    const { loader } = this.props;
    this.setState({ data: loader.getRaster({ z: 0, level: 1 }) });
  }

  renderLayers() {
    const { loader, visible, opacity, colormap } = this.props;
    const { imageWidth, imageHeight, dtype } = loader.vivMetadata;
    const { sliderValues, colorValues } = overrideChannelProps(this.props);
    const { data } = this.state;
    return new XRLayer({
      channelData: data,
      data: null,
      bounds: [0, imageHeight, imageWidth, 0],
      // Colormaps should only use one sliderValue pair.
      // Going forward, we should have more intricate indexing so we can
      // have multiple data slices loaded and
      // simply change the index to get different views.
      // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/109
      sliderValues: colormap ? sliderValues.slice(0, 2) : sliderValues,
      // no need for color in the case of a provided colormap
      colorValues: colormap ? [] : colorValues,
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
