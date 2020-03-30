import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import StaticImageLayer from './StaticImageLayer';

export default class OverviewLayer extends CompositeLayer {
  renderLayers() {
    const { loader, id, boundingBox, boundingBoxColor } = this.props;
    const { numLevels } = loader;
    const { imageWidth, imageHeight } = loader.getRasterSize({
      z: 0
    });
    const overview = new StaticImageLayer(this.props, {
      id: `viewport-${id}`,
      scale: 2 ** (numLevels - 1),
      z: numLevels - 1
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor || [255, 0, 0],
      getLineWidth: 50
    });
    const viewportOutline = new PolygonLayer({
      id: `viewport-outline-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [0, 0],
          [imageWidth, 0],
          [imageWidth, imageHeight],
          [0, imageHeight]
        ]
      ],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: [255, 192, 204],
      getLineWidth: 400
    });
    const layers = [overview, boundingBoxOutline, viewportOutline];
    return layers;
  }
}

OverviewLayer.layerName = 'VivVOverviewLayeriewerLayer';
