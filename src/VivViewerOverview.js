import { OrthographicView } from '@deck.gl/core';
import { OverviewLayer } from './layers';

function _makeBoundingBox({ viewState, height, width }) {
  const viewport = new OrthographicView().makeViewport({
    // From the current `detail` viewState, we need its projection matrix (actually the inverse).
    viewState,
    height,
    width
  });
  // Use the inverse of the projection matrix to map screen to the view space.
  return [
    viewport.unproject([0, 0]),
    viewport.unproject([viewport.width, 0]),
    viewport.unproject([viewport.width, viewport.height]),
    viewport.unproject([0, viewport.height])
  ];
}

export default class VivViewerOverview {
  constructor({
    viewWidth,
    viewHeight,
    loader,
    offset = 25,
    overviewLocation = 'bottom-right',
    id = 'overview',
    boundingBoxColor = [255, 0, 0],
    boundingBoxOutlineWidth = 1,
    viewportOutlineColor = [255, 192, 204],
    viewportOutlineWidth = 2,
    overviewScale = 1
  }) {
    const { numLevels } = loader;
    const rasterSize = loader.getRasterSize({
      z: 0
    });
    this.offset = offset;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.id = id;
    this.overviewScale = overviewScale;
    this._numLevels = numLevels;
    this.width = viewWidth * overviewScale;
    this.height = this.width * (rasterSize.height / rasterSize.width);
    this.imageHeight = rasterSize.height;
    this.imageWidth = rasterSize.width;
    this.overviewLocation = overviewLocation;
    this.boundingBoxColor = boundingBoxColor;
    this.boundingBoxOutlineWidth = boundingBoxOutlineWidth;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }

  _getOverviewOffsets() {
    const {
      height,
      width,
      offset,
      viewWidth,
      viewHeight,
      overviewLocation
    } = this;
    /* eslint-disable no-bitwise */
    switch (overviewLocation) {
      case 'bottom-right': {
        return [
          // offset is the offset from the corner
          viewWidth - width - offset,
          viewHeight - height - offset
        ];
      }
      case 'top-right': {
        return [viewWidth - width - offset, offset];
      }
      case 'top-left': {
        return [offset, offset];
      }
      case 'bottom-left': {
        return [offset, viewHeight - height - offset];
      }
      default: {
        throw new Error(
          'overviewLocation prop needs to be one of [bottom-right, top-right, top-left, bottom-left]'
        );
      }
    }
    /* eslint-disable no-bitwise */
  }

  getView() {
    const { height, width, overviewLocation, id } = this;
    const [overviewXOffset, overviewYOffset] = this._getOverviewOffsets(
      overviewLocation
    );
    return new OrthographicView({
      id,
      controller: false,
      height,
      width,
      x: overviewXOffset,
      y: overviewYOffset,
      clear: true
    });
  }

  getViewState(viewState) {
    const { id, width, height } = this;
    return {
      ...viewState,
      id,
      target: [width / 2, height / 2, 0],
      zoom: 0
    };
  }

  getLayer({ viewState, props }) {
    if (viewState.overview) {
      const {
        id,
        boundingBoxColor,
        boundingBoxOutlineWidth,
        viewportOutlineColor,
        viewportOutlineWidth,
        overviewScale,
        viewHeight,
        viewWidth,
        height,
        width,
        imageHeight,
        imageWidth
      } = this;
      const boundingBoxOverview = _makeBoundingBox({
        viewState: viewState.overview,
        height,
        width
      });
      const translate = boundingBoxOverview[0];
      const viewport = new OrthographicView().makeViewport({
        // From the current `detail` viewState, we need its projection matrix (actually the inverse).
        viewState: viewState.detail,
        height: viewHeight,
        width: viewWidth
      });

      const boundingBoxDetail = [
        [0, 0],
        [viewport.width * overviewScale, 0],
        [viewport.width * overviewScale, viewport.height * overviewScale],
        [0, viewport.height * overviewScale]
      ];
      console.log(boundingBoxDetail, boundingBoxOverview);
      const { loader } = props;
      return new OverviewLayer(props, {
        id: `${loader.type}-${id}`,
        boundingBoxDetail,
        boundingBoxOverview,
        boundingBoxColor,
        boundingBoxOutlineWidth,
        viewportOutlineColor,
        viewportOutlineWidth,
        ...props
      });
    }
    return null;
  }
}
