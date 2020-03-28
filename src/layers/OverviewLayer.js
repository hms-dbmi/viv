import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import StaticImageLayer from './StaticImageLayer';

export default class OverviewLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      boundingBox
    } = this.props;
    const { numLevels } = loader;
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
      getLineColor: [255, 0, 0],
      getLineWidth: 50
    });
    const layers = [overview, boundingBoxOutline];
    return layers;
  }
}

OverviewLayer.layerName = 'VivVOverviewLayeriewerLayer';
