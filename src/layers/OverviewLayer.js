import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import StaticImageLayer from './StaticImageLayer';

const defaultProps = {
  pickable: false,
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
  boundingBoxOutlineWidth: { type: 'number', value: 50, compare: true },
  viewportOutlineColor: { type: 'array', value: [255, 190, 0], compare: true },
  viewportOutlineWidth: { type: 'number', value: 400, compare: true },
  overviewScale: { type: 'number', value: 1, compare: true }
};

/**
 * This layer wraps a StaticImageLayer as an overview, as well as a bounding box of the detail view and a polygon boundary for the view
 * @param {Array} sliderValues The list of [min, max] values for each channe to control rendering.
 * @param {Array} colorValues The list of [r, g, b] values for each channel.
 * @param {Array} channelIsOn The list of boolean values for each channel for whether or not it is visible.
 * @param {number} opacity The opacity of the layer.
 * @param {string} colormap A string indicating a colormap (default: '')
 * @param {Array} domain An override for the possible max/min values (i.e something different than 65535 for uint16/'<u2')
 * @param {Object} loader The loader to be used for fetching data.  It must implement/return `getRaster` and `dtype`
 * @param {Array} boundingBoxColor The [r, g, b] color of the bounding box (default: [255, 0, 0])
 * @param {number} boundingBoxOutlineWidth The width of the bounding box (default: 50)
 * @param {Array} viewportOutlineColor The [r, g, b] color of the outline (default: [255, 190, 0])
 * @param {number} viewportOutlineWidth The viewport outline width (default: 400)
 */
export default class OverviewLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    } = this.props;
    const { numLevels } = loader;
    const { width, height } = loader.getRasterSize({
      z: 0
    });
    const overview = new StaticImageLayer(this.props, {
      id: `viewport-${id}`,
      scale: 2 ** (numLevels - 1) * overviewScale,
      z: numLevels - 1
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth
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
      getLineWidth: viewportOutlineWidth
    });
    const layers = [overview, boundingBoxOutline, viewportOutline];
    return layers;
  }
}

OverviewLayer.layerName = 'OverviewLayer';
OverviewLayer.defaultProps = defaultProps;
