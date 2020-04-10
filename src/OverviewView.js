import { OrthographicView } from '@deck.gl/core';
import VivView from './VivView';
import { OverviewLayer } from './layers';
import { makeBoundingBox, getVivId } from './utils';

/**
 * This class generates a OverviewLayer and a view for use in the VivViewer as an overview to a Detailview (they must be used in conjection)
 * @param {Object} viewState The viewState object.
 * @param {Object} loader The loader, used for inferring zoom level.
 * @param {number} detailHeight The height of the detail view.
 * @param {number} detailWidth The width of the detail view.
 * @param {number} scale The scale of this viewport relative to the detail.
 * @param {number} margin The margin to be offset from the the corner of the other viewport.
 * @param {string} position The location of the viewport - one of "bottom-right", "top-right", "top-left", "bottom-left."
 * */
export default class OverviewView extends VivView {
  constructor({
    initialViewState,
    loader,
    detailHeight,
    detailWidth,
    scale,
    margin = 25,
    position = 'bottom-right'
  }) {
    super({ initialViewState });
    this.margin = margin;
    this.loader = loader;
    this.position = position;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({ detailWidth, scale });
    this._setXY();
  }

  _setHeightWidthScale({ detailWidth, scale }) {
    const { loader } = this;
    const { numLevels } = loader;
    const { width: rasterWidth, height: rasterHeight } = loader.getRasterSize({
      z: 0
    });
    const heightWidthRatio = rasterHeight / rasterWidth;
    this.width = detailWidth * scale;
    this.height = this.width * heightWidthRatio;
    this.scale = (2 ** (numLevels - 1) / rasterWidth) * this.width;
    this._imageWidth = rasterWidth;
    this._imageHeight = rasterHeight;
  }

  /**
   * Set the x and y (top left corner) of this overview relative to the detail.
   */
  _setXY() {
    const { height, width, margin, position, detailWidth, detailHeight } = this;
    switch (position) {
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
    // Scale the view as the overviewScale changes with screen resizing - basically, do not react to any view state changes.
    const {
      _imageWidth,
      _imageHeight,
      scale,
      id,
      loader,
      height,
      width
    } = this;
    const { numLevels } = loader;
    return {
      ...viewState,
      height,
      width,
      id,
      target: [(_imageWidth * scale) / 2, (_imageHeight * scale) / 2, 0],
      zoom: -(numLevels - 1)
    };
  }

  getLayer({ viewStates, props }) {
    const { id, scale, loader } = this;
    // Scale the bounding box.
    const boundingBox = makeBoundingBox(viewStates.detail).map(coords =>
      coords.map(e => e * scale)
    );
    return new OverviewLayer(props, {
      id: loader.type + getVivId(id),
      boundingBox,
      overviewScale: scale
    });
  }
}
