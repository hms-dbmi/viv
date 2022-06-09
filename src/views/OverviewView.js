/* eslint-disable max-classes-per-file */
import { Controller, OrthographicView } from '@deck.gl/core';
import VivView from './VivView';
import { OverviewLayer } from '../layers';
import { makeBoundingBox, getVivId } from './utils';

import { getImageSize } from '../loaders/utils';

export const OVERVIEW_VIEW_ID = 'overview';

class OverviewState {}

class OverviewController extends Controller {
  constructor(props) {
    super(OverviewState, props);
    this.events = ['click'];
  }

  handleEvent(event) {
    if (event.type !== 'click') {
      return;
    }
    let [x, y] = this.getCenter(event);
    const { width, height, zoom, scale } = this.controllerStateProps;
    if (x < 0 || y < 0 || x > width || y > height) {
      return;
    }
    const scaleFactor = 1 / (2 ** zoom * scale);
    x *= scaleFactor;
    y *= scaleFactor;
    if (this.onViewStateChange) {
      this.onViewStateChange({ viewState: { target: [x, y, 0] } });
    }
  }
}

/**
 * This class generates a OverviewLayer and a view for use in the VivViewer as an overview to a Detailview (they must be used in conjection).
 * From the base class VivView, only the initialViewState argument is used.  This class uses private methods to position its x and y from the
 * additional arguments:
 * @param {Object} args
 * @param {Object} args.id for thie VivView
 * @param {Object} args.loader PixelSource[], where each PixelSource is decreasing in shape. If length == 1, not multiscale.
 * @param {number} args.detailHeight Height of the detail view.
 * @param {number} args.detailWidth Width of the detail view.
 * @param {number} [args.scale] Scale of this viewport relative to the detail. Default is .2.
 * @param {number} [args.margin] Margin to be offset from the the corner of the other viewport. Default is 25.
 * @param {string} [args.position] Location of the viewport - one of "bottom-right", "top-right", "top-left", "bottom-left."  Default is 'bottom-right'.
 * @param {number} [args.minimumWidth] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumWidth] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {number} [args.minimumHeight] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumHeight] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {Boolean} [args.clickCenter] Click to center the default view. Default is true.
 * */
export default class OverviewView extends VivView {
  constructor({
    id,
    loader,
    detailHeight,
    detailWidth,
    scale = 0.2,
    margin = 25,
    position = 'bottom-right',
    minimumWidth = 150,
    maximumWidth = 350,
    minimumHeight = 150,
    maximumHeight = 350,
    clickCenter = true
  }) {
    super({ id });
    this.margin = margin;
    this.loader = loader;
    this.position = position;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({
      detailWidth,
      detailHeight,
      scale,
      minimumWidth,
      maximumWidth,
      minimumHeight,
      maximumHeight
    });
    this._setXY();
    this.clickCenter = clickCenter;
  }

  /**
   * Set the image-pixel scale and height and width based on detail view.
   */
  _setHeightWidthScale({
    detailWidth,
    detailHeight,
    scale,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight
  }) {
    const numLevels = this.loader.length;
    const { width: rasterWidth, height: rasterHeight } = getImageSize(
      this.loader[0]
    );

    this._imageWidth = rasterWidth;
    this._imageHeight = rasterHeight;

    if (rasterWidth > rasterHeight) {
      const heightWidthRatio = rasterHeight / rasterWidth;
      this.width = Math.min(
        maximumWidth,
        Math.max(detailWidth * scale, minimumWidth)
      );
      this.height = this.width * heightWidthRatio;
      this.scale = (2 ** (numLevels - 1) / rasterWidth) * this.width;
    } else {
      const widthHeightRatio = rasterWidth / rasterHeight;
      this.height = Math.min(
        maximumHeight,
        Math.max(detailHeight * scale, minimumHeight)
      );
      this.width = this.height * widthHeightRatio;
      this.scale = (2 ** (numLevels - 1) / rasterHeight) * this.height;
    }
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
    const { scale, clickCenter } = this;
    const controller = clickCenter && { type: OverviewController, scale };
    return new OrthographicView({
      controller,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y,
      clear: true
    });
  }

  filterViewState({ viewState }) {
    // Scale the view as the overviewScale changes with screen resizing - basically, do not react to any view state changes.
    const { _imageWidth, _imageHeight, scale } = this;
    return {
      ...viewState,
      height: this.height,
      width: this.width,
      id: this.id,
      target: [(_imageWidth * scale) / 2, (_imageHeight * scale) / 2, 0],
      zoom: -(this.loader.length - 1)
    };
  }

  getLayers({ viewStates, props }) {
    const { detail, overview } = viewStates;
    if (!detail) {
      throw new Error('Overview requires a viewState with id detail');
    }
    // Scale the bounding box.
    const boundingBox = makeBoundingBox(detail).map(coords =>
      coords.map(e => e * this.scale)
    );
    const overviewLayer = new OverviewLayer(props, {
      id: getVivId(this.id),
      boundingBox,
      overviewScale: this.scale,
      zoom: -overview.zoom
    });
    return [overviewLayer];
  }
}
