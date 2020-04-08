import { OrthographicView } from '@deck.gl/core';
import VivView from './VivView';
import { OverviewLayer } from './layers';

/**
 * This class generates a OverviewLayer and a view for use in the VivViewer as an overview to a Detailview (they must be used in conjection)
 * @param {Object} viewState The viewState object.
 * @param {Object} loader The loader, used for inferring zoom level.
 * @param {number} detailHeight The height of the detail view.
 * @param {number} detailWidth The width of the detail view.
 * @param {number} overviewScale The scale of this viewport relative to the detail.
 * @param {number} margin The margin to be offset from the the corner of the other viewport.
 * @param {string} overviewLocation The location of the viewport - one of "bottom-right", "top-right", "top-left", "bottom-left."
 * */
export default class OverviewView extends VivView {
  constructor({
    viewState,
    loader,
    detailHeight,
    detailWidth,
    overviewScale,
    margin = 25,
    overviewLocation = 'bottom-right'
  }) {
    super({ viewState });
    this.margin = margin;
    this.loader = loader;
    this.overviewLocation = overviewLocation;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({ detailWidth, overviewScale });
    this._setXY();
  }

  _setHeightWidthScale({ detailWidth, overviewScale }) {
    const { loader } = this;
    const { numLevels } = loader;
    const rasterSize = loader.getRasterSize({
      z: 0
    });
    const heightWidthRatio = rasterSize.height / rasterSize.width;
    this.width = detailWidth * overviewScale;
    this.height = this.width * heightWidthRatio;
    this.overviewScale = (2 ** (numLevels - 1) / rasterSize.width) * this.width;
    this._imageWidth = rasterSize.width;
    this._imageHeight = rasterSize.height;
  }

  /**
   * Set the x and y of the current view.
   */
  _setXY() {
    const {
      height,
      width,
      margin,
      overviewLocation,
      detailWidth,
      detailHeight
    } = this;
    switch (overviewLocation) {
      case 'bottom-right': {
        this.x = detailWidth - width - margin;
        this.y = detailHeight - height - margin;
        break;
      }
      case 'top-right': {
        this.x = detailWidth - width - margin;
        this.y = margin;
        break;
      }
      case 'top-left': {
        this.x = margin;
        this.y = margin;
        break;
      }
      case 'bottom-left': {
        this.x = margin;
        this.y = detailHeight - height - margin;
        break;
      }
      default: {
        throw new Error(
          `overviewLocation prop needs to be one of ['bottom-right', 'top-right', 'top-left', 'bottom-left']`
        );
      }
    }
  }

  getDeckGlView() {
    const { x, y, id, height, width } = this;
    return new OrthographicView({
      id,
      controller: false,
      height,
      width,
      x,
      y,
      clear: true
    });
  }

  getViewState(viewState) {
    // Scale the view as the overviewScale changes with screen resizing.
    const { _imageWidth, _imageHeight, overviewScale, id, loader } = this;
    const { numLevels } = loader;
    return {
      ...viewState,
      id,
      target: [
        (_imageWidth * overviewScale) / 2,
        (_imageHeight * overviewScale) / 2,
        0
      ],
      zoom: -(numLevels - 1)
    };
  }

  getLayer({ viewState, props }) {
    const { id, overviewScale, loader } = this;
    // Scale the bounding box.
    const boundingBox = VivView.makeBoundingBox(viewState.detail).map(coords =>
      coords.map(e => e * overviewScale)
    );
    return new OverviewLayer(props, {
      id: `${loader.type}-${id}`,
      boundingBox,
      overviewScale
    });
  }
}
