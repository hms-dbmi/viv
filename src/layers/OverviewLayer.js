import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import { Matrix4 } from 'math.gl';

import ImageLayer from './ImageLayer';
import { getImageSize } from '../loaders/utils';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      getRasterSize: () => ({ height: 0, width: 0 }),
      dtype: '<u2'
    },
    compare: true
  },
  id: { type: 'string', value: '', compare: true },
  boundingBox: {
    type: 'array',
    value: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ],
    compare: true
  },
  boundingBoxColor: { type: 'array', value: [255, 0, 0], compare: true },
  boundingBoxOutlineWidth: { type: 'number', value: 1, compare: true },
  viewportOutlineColor: { type: 'array', value: [255, 190, 0], compare: true },
  viewportOutlineWidth: { type: 'number', value: 2, compare: true },
  overviewScale: { type: 'number', value: 1, compare: true },
  zoom: { type: 'number', value: 1, compare: true }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} sliderValues List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<Array.<number>>} colorValues List of [r, g, b] values for each channel.
 * @property {Array.<Array.<boolean>>} channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Assumes multiscale if loader.length > 1.
 * @property {Array} loaderSelection Selection to be used for fetching data.
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {Array.<number>=} boundingBoxColor [r, g, b] color of the bounding box (default: [255, 0, 0]).
 * @property {number=} boundingBoxOutlineWidth Width of the bounding box in px (default: 1).
 * @property {Array.<number>=} viewportOutlineColor [r, g, b] color of the outline (default: [255, 190, 0]).
 * @property {number=} viewportOutlineWidth Viewport outline width in px (default: 2).
 * @property {String=} id Unique identifier for this layer.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 */
const OverviewLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      zoom,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    } = this.props;

    const { width, height } = getImageSize(loader[0]);
    const z = loader.length - 1;
    const lowestResolution = loader[z];

    const overview = new ImageLayer(this.props, {
      id: `viewport-${id}`,
      modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
      loader: lowestResolution
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth * 2 ** zoom
    });
    const viewportOutline = new PolygonLayer({
      id: `viewport-outline-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [0, 0],
          [width * overviewScale, 0],
          [width * overviewScale, height * overviewScale],
          [0, height * overviewScale]
        ]
      ],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** zoom
    });
    const layers = [overview, boundingBoxOutline, viewportOutline];
    return layers;
  }
};

OverviewLayer.layerName = 'OverviewLayer';
OverviewLayer.defaultProps = defaultProps;
export default OverviewLayer;
