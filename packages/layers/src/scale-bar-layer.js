import { COORDINATE_SYSTEM, CompositeLayer } from '@deck.gl/core';
import { LineLayer, TextLayer } from '@deck.gl/layers';
import { makeBoundingBox, range, sizeToMeters, snapValue } from './utils';

import { DEFAULT_FONT_FAMILY } from '@vivjs/constants';

function getPosition(height, width, position, length, adjustedBarLength) {
      // Position in screen space based on position parameter and length
    let xLeftCoord, yCoord;
    
    switch (position) {
      case 'bottom-right':
        yCoord = height - height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case 'bottom-left':
        yCoord = height - height * length;
        xLeftCoord = width * length;
        break;
      case 'top-right':
        yCoord = height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case 'top-left':
        yCoord = height * length;
        xLeftCoord = width * length;
        break;
      default:
        throw new Error(`Position ${position} not found`);
    }

    return [yCoord, xLeftCoord];
}

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  viewState: {
    type: 'object',
    value: { zoom: 0, target: [0, 0, 0], width: 1, height: 1 },
    compare: true
  },
  unit: { type: 'string', value: '', compare: true },
  size: { type: 'number', value: 1, compare: true },
  position: { type: 'string', value: 'bottom-right', compare: true },
  length: { type: 'number', value: 0.085, compare: true },
  snap: { type: 'boolean', value: false, compare: true }
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
 * @property {boolean} snap If true, aligns the scale bar value to predefined intervals for clearer readings, adjusting units if necessary.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 * @ignore
 */
const ScaleBarLayer = class extends CompositeLayer {
  renderLayers() {
    const { id: layerId, unit, size, position, viewState, length, snap, height, width } = this.props;
    // Get bounding box from the image view's viewState
    const boundingBox = makeBoundingBox(viewState);
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    // Bar length in image space: 5% of view width
    const barLength = viewLength * 0.05;
    // Scale to screen pixels: at zoom 1, 1 image pixel = 2 screen pixels, so multiply by 2^zoom
    const barScreenLength = barLength * Math.pow(2, viewState.zoom);

    // Bar height for tick marks (fixed screen pixels, not zoom-dependent)
    const barHeight = 10;

    // Physical distance represented by the bar
    const physicalDistance = barLength * size;

    // Calculate display values
    let displayNumber = physicalDistance.toPrecision(5);
    let displayUnit = unit;
    let adjustedBarLength = barScreenLength;

    if (snap) {
      const meterSize = sizeToMeters(size, unit);
      const numUnits = physicalDistance * meterSize;
      const [snappedOrigUnits, snappedNewUnits, snappedUnitPrefix] =
        snapValue(numUnits);
      displayNumber = snappedNewUnits;
      displayUnit = `${snappedUnitPrefix}m`;
      // Adjust bar length based on snapped value
      adjustedBarLength = (snappedOrigUnits / meterSize) * Math.pow(2, viewState.zoom);
    }

    // Position in screen space based on position parameter and length
    let xLeftCoord, yCoord;
    const isLeft = position.endsWith('-left');
    
    switch (position) {
      case 'bottom-right':
        yCoord = height - height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case 'bottom-left':
        yCoord = height - height * length;
        xLeftCoord = width * length;
        break;
      case 'top-right':
        yCoord = height * length;
        xLeftCoord = width - adjustedBarLength - width * length;
        break;
      case 'top-left':
        yCoord = height * length;
        xLeftCoord = width * length;
        break;
      default:
        throw new Error(`Position ${position} not found`);
    }

    const xRightCoord = xLeftCoord + adjustedBarLength;

    // Horizontal line for the scale bar
    const lengthBar = new LineLayer({
      id: `scale-bar-length-${layerId}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [isLeft ? xLeftCoord : xRightCoord - adjustedBarLength, yCoord],
          [isLeft ? xLeftCoord + adjustedBarLength : xRightCoord, yCoord]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });

    // Left tick mark
    const tickBoundsLeft = new LineLayer({
      id: `scale-bar-height-left-${layerId}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });

    // Right tick mark
    const tickBoundsRight = new LineLayer({
      id: `scale-bar-height-right-${layerId}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });

    // Text label
    const textLayer = new TextLayer({
      id: `units-label-layer-${layerId}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        {
          text: `${displayNumber}${displayUnit}`,
          position: [
            isLeft
              ? xLeftCoord + adjustedBarLength * 0.5
              : xRightCoord - adjustedBarLength * 0.5,
            yCoord - barHeight * 2
          ]
        }
      ],
      getColor: [220, 220, 220, 255],
      getSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      sizeUnits: 'pixels',
      sizeScale: 1,
      characterSet: [
        ...displayUnit.split(''),
        ...[...Array(10).keys()].map(i => String(i)),
        '.',
        'e',
        '+'
      ]
    });

    return [lengthBar, tickBoundsLeft, tickBoundsRight, textLayer];
  }
};

ScaleBarLayer.layerName = 'ScaleBarLayer';
ScaleBarLayer.defaultProps = defaultProps;
export default ScaleBarLayer;
