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
  boundingBoxOutlineWidth: { type: 'number', value: 10, compare: true },
  viewportOutlineColor: { type: 'array', value: [0, 255, 0], compare: true },
  viewportOutlineWidth: { type: 'number', value: 10, compare: true }
};

function calculateScaleAndTranslate(boundingBoxOverview, width, height) {
  const translate = boundingBoxOverview[0];
  const scale = Math.max(
    (boundingBoxOverview[2][0] - boundingBoxOverview[0][0]) / width,
    (boundingBoxOverview[2][1] - boundingBoxOverview[0][1]) / height
  );
  return { scale, translate };
}

export default class OverviewLayer extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      boundingBoxDetail,
      boundingBoxOverview,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth
    } = this.props;
    const { numLevels } = loader;
    const { width, height } = loader.getRasterSize({
      z: numLevels - 1
    });
    const { scale, translate } = calculateScaleAndTranslate(
      boundingBoxOverview,
      width,
      height
    );
    const overview = new StaticImageLayer(this.props, {
      id: `viewport-${id}`,
      scale,
      translate,
      z: numLevels - 1
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBoxDetail],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth
    });
    // const viewportOutline = new PolygonLayer({
    //   id: `viewport-outline-${id}`,
    //   coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    //   data: [boundingBoxOverview],
    //   getPolygon: f => f,
    //   filled: false,
    //   stroked: true,
    //   getLineColor: viewportOutlineColor,
    //   getLineWidth: viewportOutlineWidth
    // });
    const layers = [overview, boundingBoxOutline];
    return layers;
  }
}

OverviewLayer.layerName = 'OverviewLayer';
OverviewLayer.defaultProps = defaultProps;
