import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import StaticImageLayer from './StaticImageLayer';

export default class OverviewLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth
    } = this.props;
    const { numLevels } = loader;
    const { width, height } = loader.getRasterSize({
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
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth
    });
    const viewportOutline = new PolygonLayer({
      id: `viewport-outline-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [0, 0],
          [width, 0],
          [width, height],
          [0, height]
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

OverviewLayer.layerName = 'VivVOverviewLayeriewerLayer';
