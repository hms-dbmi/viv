import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { LineLayer, TextLayer } from '@deck.gl/layers';

/**
 * This layer creates a dynamically sizing scale bar using three PolygonLayers.
 * @param {Object} props
 * @param {Number} props.physicalSizeXUnit The physical unit size per pixel at full resolution
 * @param {string} props.position Location of the physicalUnitXSize bar - one of "bottom-right", "top-right", "top-left", "bottom-left."  Default is 'bottom-right'.
 */
export default class ScaleBarLayer extends CompositeLayer {
  renderLayers() {
    const { id, boundingBox, PhysicalSizeXUnit, PhysicalSizeX } = this.props;
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    const yCoord =
      boundingBox[2][1] - (boundingBox[2][1] - boundingBox[0][1]) * 0.07;
    const xLeftCoord = boundingBox[2][0] - viewLength * 0.07;
    const barLength = viewLength * 0.05;
    const barHeight = (boundingBox[2][1] - boundingBox[0][1]) * 0.005;
    const numUnits = barLength * PhysicalSizeX;
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
          text: String(numUnits).slice(0, 5) + PhysicalSizeXUnit,
          position: [xLeftCoord + barLength * 0.5, yCoord + barHeight * 4]
        }
      ],
      getColor: [220, 220, 220, 255],
      getSize: 11,
      characterSet: [
        ...PhysicalSizeXUnit.split(''),
        ...String(numUnits).split('')
      ]
    });
    return [lengthBar, tickBoundsLeft, tickBoundsRight, textLayer];
  }
}

ScaleBarLayer.layerName = 'ScaleBarLayer';
