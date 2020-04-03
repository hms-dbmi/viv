import { OrthographicView } from '@deck.gl/core';
import { OverviewLayer } from './layers';

export default class VivViewerOverview {
  constructor({
    viewWidth,
    viewHeight,
    loader,
    margin = 25,
    overviewLocation = 'bottom-right',
    id = 'overview',
    boundingBoxColor = [255, 0, 0],
    boundingBoxOutlineWidth = 50,
    viewportOutlineColor = [255, 192, 204],
    viewportOutlineWidth = 400,
    overviewScale = 1
  }) {
    const { numLevels } = loader;
    const rasterSize = loader.getRasterSize({
      z: 0
    });
    this.margin = margin;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.id = id;
    this._numLevels = numLevels;
    // These are the pixel-space height and width
    this.width = viewWidth * overviewScale;
    this.height = this.width * (rasterSize.height / rasterSize.width);
    // This is the ratio of the "zoomed out" image to the width of the viewport
    this.overviewScale = (2 ** (numLevels - 1) / rasterSize.width) * this.width;
    this.imageHeight = rasterSize.height;
    this.imageWidth = rasterSize.width;
    this.overviewLocation = overviewLocation;
    this.boundingBoxColor = boundingBoxColor;
    this.boundingBoxOutlineWidth = boundingBoxOutlineWidth;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }

  _makeBoundingBox(viewState) {
    const { viewHeight, viewWidth, overviewScale } = this;
    const viewport = new OrthographicView().makeViewport({
      // From the current `detail` viewState, we need its projection matrix (actually the inverse).
      viewState,
      height: viewHeight,
      width: viewWidth
    });
    // Use the inverse of the projection matrix to map screen to the view space.
    return [
      viewport.unproject([0, 0]),
      viewport.unproject([viewport.width, 0]),
      viewport.unproject([viewport.width, viewport.height]),
      viewport.unproject([0, viewport.height])
    ].map(coord => coord.map(e => e * overviewScale));
  }

  _getOverviewMargins() {
    const {
      height,
      width,
      margin,
      viewWidth,
      viewHeight,
      overviewLocation
    } = this;
    switch (overviewLocation) {
      case 'bottom-right': {
        return [
          // margin is the margin from the corner
          viewWidth - width - margin,
          viewHeight - height - margin
        ];
      }
      case 'top-right': {
        return [viewWidth - width - margin, margin];
      }
      case 'top-left': {
        return [margin, margin];
      }
      case 'bottom-left': {
        return [margin, viewHeight - height - margin];
      }
      default: {
        throw new Error(
          `overviewLocation prop needs to be one of ['bottom-right', 'top-right', 'top-left', 'bottom-left']```
        );
      }
    }
  }

  getView() {
    const { height, width, overviewLocation, id } = this;
    const [overviewXMargin, overviewYMargin] = this._getOverviewMargins(
      overviewLocation
    );
    return new OrthographicView({
      id,
      controller: false,
      height,
      width,
      x: overviewXMargin,
      y: overviewYMargin,
      clear: true
    });
  }

  getViewState(viewState) {
    const { imageWidth, imageHeight, overviewScale, _numLevels, id } = this;
    return {
      ...viewState,
      id,
      target: [
        (imageWidth * overviewScale) / 2,
        (imageHeight * overviewScale) / 2,
        0
      ],
      zoom: -(_numLevels - 1)
    };
  }

  getLayer({ viewState, props }) {
    const boundingBox = this._makeBoundingBox(viewState);
    const {
      id,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    } = this;
    const { loader } = props;
    return new OverviewLayer(props, {
      id: `${loader.type}-${id}`,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    });
  }
}
