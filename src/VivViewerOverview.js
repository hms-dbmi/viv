import { OrthographicView } from '@deck.gl/core';
import { OverviewLayer } from './layers';

export default class VivViewerOverview {
  constructor({
    viewWidth,
    viewHeight,
    loader,
    offset = 25,
    height = 0,
    width = 0,
    overviewLocation = 'bottom-right',
    id = 'overview',
    boundingBoxColor = [255, 0, 0],
    boundingBoxOutlineWidth = 50,
    viewportOutlineColor = [255, 192, 204],
    viewportOutlineWidth = 400
  }) {
    const { numLevels } = loader;
    const rasterSize = loader.getRasterSize({
      z: 0
    });
    this.offset = offset;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.id = id;
    // These are the pixel-space height and width
    /* eslint-disable no-bitwise */
    this.height = height || rasterSize.height >> (numLevels - 1);
    this.width = width || rasterSize.width >> (numLevels - 1);
    /* eslint-disable no-bitwise */
    this.overviewLocation = overviewLocation;
    this.boundingBoxColor = boundingBoxColor;
    this.boundingBoxOutlineWidth = boundingBoxOutlineWidth;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }

  _makeBoundingBox(viewState) {
    const { viewHeight, viewWidth } = this;
    const viewport = new OrthographicView().makeViewport({
      // From the current `detail` viewState, we need its projection matrix (actually the inverse).
      viewState: viewState.detail,
      height: viewHeight,
      width: viewWidth
    });
    // Use the inverse of the projection matrix to map screen to the view space.
    return [
      viewport.unproject([0, 0]),
      viewport.unproject([viewport.width, 0]),
      viewport.unproject([viewport.width, viewport.height]),
      viewport.unproject([0, viewport.height])
    ];
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

  getLayer({ viewState, props }) {
    const boundingBox = this._makeBoundingBox(viewState);
    const {
      id,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth
    } = this;
    const { loader } = props;
    return new OverviewLayer(props, {
      id: `${loader.type}-${id}`,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      ...props
    });
  }
}
