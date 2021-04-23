import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { LineLayer, TextLayer } from '@deck.gl/layers';
import { Matrix4 } from 'math.gl';
import { range } from './utils';
import { DEFAULT_FONT_FAMILY } from '../constants';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  viewState: {
    type: 'object',
    value: { zoom: 0, target: [0, 0, 0] },
    compare: true
  },
  unit: { type: 'string', value: '', compare: true },
  size: { type: 'number', value: 1, compare: true },
  position: { type: 'string', value: 'bottom-right', compare: true },
  length: { type: 'number', value: 0.2, compare: true },
  labels: { type: 'array', value: ['x', 'y', 'z'], compare: true },
  modelMatrix: { type: 'object', value: new Matrix4(), compare: true }
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {String} unit Physical unit size per pixel at full resolution.
 * @property {Number} size Physical size of a pixel.
 * @property {Object} viewState The current viewState for the desired view.  We cannot internally use this.context.viewport because it is one frame behind:
 * https://github.com/visgl/deck.gl/issues/4504
 * @property {Array=} boundingBox Boudning box of the view in which this should render.
 * @property {string=} id Id from the parent layer.
 * @property {number=} length Value from 0 to 1 representing the portion of the view to be used for the length part of the scale bar.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 * @ignore
 */
const AxesLayer3D = class extends CompositeLayer {
  renderLayers() {
    const {
      id,
      units,
      sizes,
      labels,
      viewState,
      shape,
      length,
      modelMatrix
    } = this.props;
    const { zoom } = viewState;
    const barLength = Math.max(...shape) * length;
    const axisLineLayers = labels.map(
      (axis, index) =>
        new LineLayer({
          id: `scale-bar-length-${id}-${axis}`,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          data: [
            [
              [0, 0, 0],
              [0, 0, 0].map((i, j) => (j === index ? barLength : i))
            ].map(point => modelMatrix.transformPoint(point))
          ],
          getSourcePosition: d => d[0],
          getTargetPosition: d => d[1],
          getWidth: 2,
          getColor: [0, 0, 0, 255].map((i, j) => (j === index ? 255 : i))
        })
    );
    const textLayers = labels.map(
      (axis, index) =>
        new TextLayer({
          id: `units-label-layer-${id}-${axis}`,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          data: [
            {
              text: `${
                String(sizes[index] * barLength)
                  .slice(0, 5)
                  .replace(/\.$/, '') + units[index]
              } (${axis})`,
              position: modelMatrix.transformPoint(
                [0, 0, 0]
                  .map((i, j) => (j === index ? barLength * 0.95 : i))
                  .map((i, j) =>
                    j % 3 === (index + 1) % 3 ? barLength * 0.105 : i
                  )
              )
            }
          ],
          getColor: [0, 0, 0, 255].map((i, j) => (j === index ? 255 : i)),
          getSize: barLength * 0.2,
          fontFamily: DEFAULT_FONT_FAMILY,
          sizeUnits: 'meters',
          sizeScale: Math.min(1, 2 ** -(zoom + 2)),
          characterSet: [
            ...units[index].split(''),
            ...range(10).map(i => String(i)),
            '.',
            ...labels,
            '(',
            ')',
            ' '
          ]
        })
    );
    return [...axisLineLayers, ...textLayers];
  }
};

AxesLayer3D.layerName = 'AxesLayer3D';
AxesLayer3D.defaultProps = defaultProps;
export default AxesLayer3D;
