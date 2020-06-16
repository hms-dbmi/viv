import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { isWebGL2 } from '@luma.gl/core';

import XRLayer from './XRLayer';
import { padTileWithZeros } from '../loaders/utils';
import { to32BitFloat } from './utils';

const defaultProps = {
  pickable: true,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  loaderSelection: { type: 'array', value: [], compare: true },
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

/*
 * For some reason data of uneven length fails to be converted to a texture (Issue #144).
 * Here we pad the width of tile by one if the data is uneven in length, which seemingly
 * fixes the rendering. This is not ideal since padding the tile makes a copy of underlying
 * buffer, but without digging deeper into the WebGL it is a reasonable fix.
 */
function padEven(data, width, height) {
  const targetWidth = (width * height) % 2 === 0 ? width : width + 1;
  const padded = data.map(d =>
    padTileWithZeros({ data: d, width, height }, targetWidth, height)
  );
  return { data: padded, width: targetWidth, height };
}

/**
 * This layer wraps XRLayer and generates a static image
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {number} props.opacity Opacity of the layer.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @param {string} props.viewportId Id for the current view.
 * @param {Array} props.translate Translate transformation to be applied to the bounds after scaling.
 * @param {number} props.scale Scaling factor for this layer to be used against the dimensions of the loader's `getRaster`.
 * @param {Object} props.loader Loader to be used for fetching data.  It must implement/return `getRaster` and `dtype`.
 * @param {String} props.onHover Hook function from deck.gl to handle hover objects.
 */
export default class StaticImageLayer extends CompositeLayer {
  initializeState() {
    const { loader, z, loaderSelection } = this.props;
    loader.getRaster({ z, loaderSelection }).then(({ data, width, height }) => {
      this.setState(
        padEven(
          !isWebGL2(this.context.gl) ? to32BitFloat(data) : data,
          width,
          height
        )
      );
    });
  }

  updateState({ changeFlags, props, oldProps }) {
    const { propsChanged } = changeFlags;
    const loaderChanged =
      typeof propsChanged === 'string' && propsChanged.includes('props.loader');
    const loaderSelectionChanged =
      props.loaderSelection !== oldProps.loaderSelection;
    if (loaderChanged || loaderSelectionChanged) {
      // Only fetch new data to render if loader has changed
      const { loader, z, loaderSelection } = this.props;
      loader
        .getRaster({ z, loaderSelection })
        .then(({ data, width, height }) => {
          this.setState(
            padEven(
              !isWebGL2(this.context.gl) ? to32BitFloat(data) : data,
              width,
              height
            )
          );
        });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getPickingInfo({ info, sourceLayer }) {
    // eslint-disable-next-line no-param-reassign
    info.sourceLayer = sourceLayer;
    // eslint-disable-next-line no-param-reassign
    info.tile = sourceLayer.props.tile;
    return info;
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
      z,
      domain,
      pickable,
      id
    } = this.props;
    const { dtype } = loader;
    const { data, width, height } = this.state;
    if (!(width && height)) return null;
    const bounds = scaleBounds({
      width,
      height,
      translate,
      scale
    });
    return new XRLayer({
      channelData: Promise.resolve({ data, width, height }),
      pickable,
      bounds,
      sliderValues,
      colorValues,
      channelIsOn,
      domain,
      id: `XR-Static-Layer-${0}-${height}-${width}-${0}-${z}-${id}`,
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
