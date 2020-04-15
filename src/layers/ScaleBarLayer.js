import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import * as Qty from 'js-quantities';

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
 * This layer creates a dynamically sizing scale bar using three PolygonLayers.
 * @param {Object} props
 * @param {Number} props.physicalSizeXUnit The physical unit size per pixel at full resolution
 * @param {string} props.position Location of the physicalUnitXSize bar - one of "bottom-right", "top-right", "top-left", "bottom-left."  Default is 'bottom-right'.
 */
export default class ScaleBarLayer extends CompositeLayer {
  // This Layer reacts to viewport changes.
  // eslint-disable-next-line class-methods-use-this
  shouldUpdateState({ changeFlags }) {
    return changeFlags.viewportChanged;
  }

  renderLayers() {
    const { physicalSizeXUnit, id } = this.props;
    const { viewport } = this.context;
    const boundingBox = [
      viewport.unproject([0, 0]),
      viewport.unproject([viewport.width, 0]),
      viewport.unproject([viewport.width, viewport.height]),
      viewport.unproject([0, viewport.height])
    ];
    const yCoord =
      boundingBox[2][1] - (boundingBox[2][1] - boundingBox[0][1]) * 0.1;
    const xLeftCoord =
      boundingBox[2][0] - (boundingBox[2][0] - boundingBox[0][0]) * 0.1;
    const numUnits =
      Qty(physicalSizeXUnit).scalar *
      ((boundingBox[2][0] - boundingBox[0][0]) * 0.1) *
      2 ** -viewport.zoom;
    const lengthBar = new LineLayer({
      id: `scale-bar-length-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [xLeftCoord, yCoord],
          [xLeftCoord + numUnits, yCoord]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    return [lengthBar];
  }
}

ScaleBarLayer.layerName = 'ScaleBarLayer';
ScaleBarLayer.defaultProps = defaultProps;
