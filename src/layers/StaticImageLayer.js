import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import XRLayer from './XRLayer';

import { overrideChannelProps } from './utils';

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  loader: {
    type: 'object',
    value: {
      getTile: () => [],
      vivMetadata: { imageHeight: 0, imageWidth: 0 }
    },
    compare: true
  }
};

export default class StaticImageLayer extends CompositeLayer {
  initializeState() {
    const { loader } = this.props;
    this.setState({ data: loader.getTile({ x: 0, y: 0, z: 0 }) });
  }

  renderLayers() {
    const { loader, visible } = this.props;
    const { imageWidth, imageHeight } = loader.vivMetadata;
    const { sliderValues, colorValues } = overrideChannelProps(this.props);
    const { data } = this.state;
    return new XRLayer({
      channelData: data,
      bounds: [0, imageHeight, imageWidth, 0],
      sliderValues,
      colorValues,
      staticImageHeight: imageHeight,
      staticImageWidth: imageWidth,
      id: `XR-Static-Layer-${0}-${imageHeight}-${imageWidth}-${0}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      visible
    });
  }
}

StaticImageLayer.layerName = 'StaticImageLayer';
StaticImageLayer.defaultProps = defaultProps;
