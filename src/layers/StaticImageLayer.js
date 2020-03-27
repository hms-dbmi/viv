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
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      dtype: '<u2'
    },
    compare: true
  },
  z: { type: 'number', value: 0, compare: true }
};

function scaleBounds({ width, height, translate, scale }) {
  const [left, top] = translate;
  const right = width * scale + left;
  const bottom = height * scale + top;
  return [left, bottom, right, top];
}

export default class StaticImageLayer extends CompositeLayer {
  initializeState() {
    const { loader, z } = this.props;
    loader.getRaster({ z }).then(({ data, width, height }) => {
      this.setState({ data, width, height });
    });
  }

  updateState({ changeFlags }) {
    const { propsChanged } = changeFlags;
    if (
      typeof propsChanged === 'string' &&
      propsChanged.includes('props.loader')
    ) {
      // Only fetch new data to render if loader has changed
      const { loader, z } = this.props;
      loader.getRaster({ z }).then(({ data, width, height }) => {
        this.setState({ data, width, height });
      });
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

    const { dtype } = loader;
    const { paddedSliderValues, paddedColorValues } = padColorsAndSliders({
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      dtype
    });

    const { data, width, height } = this.state;
    const bounds = scaleBounds({
      width,
      height,
      translate,
      scale
    });

    if (!(width && height)) return null;

    return new XRLayer({
      channelData: Promise.resolve(data),
      bounds,
      sliderValues: paddedSliderValues,
      colorValues: paddedColorValues,
      id: `XR-Static-Layer-${0}-${width}-${height}-${0}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      width,
      height,
      opacity,
      visible,
      dtype,
      colormap
    });
  }
}

StaticImageLayer.layerName = 'StaticImageLayer';
StaticImageLayer.defaultProps = defaultProps;
