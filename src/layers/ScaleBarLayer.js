import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { LineLayer, TextLayer } from '@deck.gl/layers';
import { range } from './utils';
import { makeBoundingBox } from '../views/utils';
import { DEFAULT_FONT_FAMILY } from '../constants';

function getPosition(boundingBox, position, length) {
  const viewLength = boundingBox[2][0] - boundingBox[0][0];
  switch (position) {
    case 'bottom-right': {
      const yCoord =
        boundingBox[2][1] - (boundingBox[2][1] - boundingBox[0][1]) * length;
      const xLeftCoord = boundingBox[2][0] - viewLength * length;
      return [yCoord, xLeftCoord];
    }
    case 'top-right': {
      const yCoord = (boundingBox[2][1] - boundingBox[0][1]) * length;
      const xLeftCoord = boundingBox[2][0] - viewLength * length;
      return [yCoord, xLeftCoord];
    }
    case 'top-left': {
      const yCoord = (boundingBox[2][1] - boundingBox[0][1]) * length;
      const xLeftCoord = viewLength * length;
      return [yCoord, xLeftCoord];
    }
    case 'bottom-left': {
      const yCoord =
        boundingBox[2][1] - (boundingBox[2][1] - boundingBox[0][1]) * length;
      const xLeftCoord = viewLength * length;
      return [yCoord, xLeftCoord];
    }
    default: {
      throw new Error(`Position ${position} not found`);
    }
  }
}

const defaultProps = {
  pickable: true,
  viewState: {
    type: 'object',
    value: { zoom: 0, target: [0, 0, 0] },
    compare: true
  },
  unit: { type: 'string', value: '', compare: true },
  size: { type: 'number', value: 1, compare: true },
  position: { type: 'string', value: 'bottom-right', compare: true },
  length: { type: 'number', value: 0.085, compare: true }
};

/**
 * This layer creates a scale bar using three LineLayers and a TextLayer.
 * Looks like: |--------| made up of three LineLayers (left tick, right tick, center length bar) and a bottom TextLayer
 * @param {Object} props
 * @param {String} props.unit Physical unit size per pixel at full resolution.
 * @param {Number} props.size Physical size of a pixel.
 * @param {Array} props.boundingBox Boudning box of the view in which this should render.
 * @param {id} props.id Id from the parent layer.
 * @param {ViewState} props.viewState The current viewState for the desired view.  We cannot internally use this.context.viewport because it is one frame behind:
 * https://github.com/visgl/deck.gl/issues/4504
 * @param {ViewState} props.length Value from 0 to 1 representing the portion of the view to be used for the length part of the scale bar.
 */
export default class ScaleBarLayer extends CompositeLayer {
  renderLayers() {
    const { id, unit, size, position, viewState, length } = this.props;
    const boundingBox = makeBoundingBox(viewState);
    const { zoom } = viewState;
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    const barLength = viewLength * 0.05;
    // This is a good heuristic for stopping the bar tick marks from getting too small
    // and/or the text squishing up into the bar.
    const barHeight = Math.max(
      2 ** (-zoom + 1.5),
      (boundingBox[2][1] - boundingBox[0][1]) * 0.007
    );
    const numUnits = barLength * size;
    const [yCoord, xLeftCoord] = getPosition(boundingBox, position, length);
    const lengthBar = new LineLayer({
      id: `scale-bar-length-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [xLeftCoord, yCoord],
          [xLeftCoord + barLength, yCoord]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsLeft = new LineLayer({
      id: `scale-bar-height-left-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [xLeftCoord, yCoord - barHeight],
          [xLeftCoord, yCoord + barHeight]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsRight = new LineLayer({
      id: `scale-bar-height-right-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [xLeftCoord + barLength, yCoord - barHeight],
          [xLeftCoord + barLength, yCoord + barHeight]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const textLayer = new TextLayer({
      id: `units-label-layer-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        {
          text: String(numUnits).slice(0, 5) + unit,
          position: [xLeftCoord + barLength * 0.5, yCoord + barHeight * 4]
        }
      ],
      getColor: [220, 220, 220, 255],
      getSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      sizeUnits: 'meters',
      sizeScale: 2 ** -zoom,
      characterSet: [...unit.split(''), ...range(10).map(i => String(i)), '.']
    });
    return [lengthBar, tickBoundsLeft, tickBoundsRight, textLayer];
  }
}

ScaleBarLayer.layerName = 'ScaleBarLayer';
ScaleBarLayer.defaultProps = defaultProps;
