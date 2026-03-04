import { COORDINATE_SYSTEM, OrthographicView } from '@deck.gl/core';
import { LineLayer, TextLayer } from '@deck.gl/layers';
import { DEFAULT_FONT_FAMILY } from '@vivjs/constants';
import { makeBoundingBox } from '@vivjs/layers';
import VivView from './VivView';
import { getVivId, sizeToMeters, snapValue } from './utils';

export const SCALEBAR_VIEW_ID = 'scalebar';

/**
 * This class generates a ScaleBar view that displays a scale bar in a specific screen position.
 * The scale bar is positioned via the view mechanism and maintains a consistent visual position on screen.
 *
 * @param {Object} args
 * @param {string} args.id id for this VivView (should be unique)
 * @param {number} args.width Width of the view on screen
 * @param {number} args.height Height of the view on screen
 * @param {number=} args.x X (top-left) location on screen. Default is 0.
 * @param {number=} args.y Y (top-left) location on screen. Default is 0.
 * @param {string=} args.unit Physical unit size per pixel at full resolution. Default is ''.
 * @param {number=} args.size Physical size of a pixel. Default is 1.
 * @param {string=} args.position Position within the view ('bottom-right', 'top-right', 'top-left', 'bottom-left'). Default is 'bottom-right'.
 * @param {number=} args.length Length of the scale bar as a fraction (0-1) of view dimension. Default is 0.085.
 * @param {boolean=} args.snap If true, aligns the scale bar value to predefined intervals. Default is false.
 * @param {string=} args.imageViewId The id of the image view to track zoom from. Used to calculate correct scale values.
 */
export default class ScaleBarView extends VivView {
  constructor({
    id,
    width,
    height,
    x = 0,
    y = 0,
    unit = '',
    size = 1,
    position = 'bottom-right',
    length = 0.085,
    snap = false,
    imageViewId = null
  }) {
    super({ id, x, y, width, height });
    this.id = id;
    this.unit = unit;
    this.size = size;
    this.position = position;
    this.length = length;
    this.snap = snap;
    this.imageViewId = imageViewId;
  }

  getDeckGlView() {
    const { id, height, width, x, y } = this;
    return new OrthographicView({
      id,
      controller: false, // Disable interaction on scale bar view
      height,
      width,
      x,
      y
    });
  }

  filterViewState({ viewState }) {
    // Do not react to any view state changes - always return fixed viewState
    // This keeps the scale bar pinned to its screen location
    const { id, height, width } = this;
    return {
      ...viewState,
      id,
      height,
      width,
      target: [width / 2, height / 2, 0],
      zoom: 0
    };
  }

  getLayers({ viewStates }) {
    const { id, height, width, unit, size, position, length, snap, imageViewId } = this;

    // Get the image view's viewState to calculate correct scale
    const imageViewState = viewStates[imageViewId];
    const zoom = imageViewState.zoom;
    // Get bounding box from the image view's viewState
    const boundingBox = makeBoundingBox(imageViewState);
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    
    // Bar length in image space: 5% of view width
    const barLength = viewLength * 0.05;
    // Scale to screen pixels: at zoom 1, 1 image pixel = 2 screen pixels, so multiply by 2^zoom
    const barScreenLength = barLength * Math.pow(2, zoom);

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
      adjustedBarLength = (snappedOrigUnits / meterSize) * Math.pow(2, zoom);
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
    const layerId = getVivId(id);

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
}
