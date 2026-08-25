import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { PolygonLayer } from '@deck.gl/layers';
import { makeBoundingBox } from '@vivjs/layers';

import VivView from './VivView';
import { getImageLayer, getVivId } from './utils';

/** Effective orthographic zoom; deck.gl v9+ may store it in zoomX/zoomY instead of zoom. */
function getViewZoom({ zoom, zoomX, zoomY } = {}) {
  if (zoomX != null) {
    return zoomX;
  }
  if (zoomY != null) {
    return zoomY;
  }
  if (Array.isArray(zoom)) {
    return zoom[0];
  }
  return zoom;
}
/**
 * This class generates a MultiscaleImageLayer and a view for use in the SideBySideViewer.
 * It is linked with its other views as controlled by `linkedIds`, `zoomLock`, and `panLock` parameters.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {Array<String>} args.linkedIds Ids of the other views to which this could be locked via zoom/pan.
 * @param {Boolean} args.panLock Whether or not we lock pan.
 * @param {Boolean} args.zoomLock Whether or not we lock zoom.
 * @param {Array=} args.viewportOutlineColor Outline color of the border (default [255, 255, 255])
 * @param {number=} args.viewportOutlineWidth Default outline width (default 10)
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
export default class SideBySideView extends VivView {
  constructor({
    id,
    x = 0,
    y = 0,
    height,
    width,
    linkedIds = [],
    panLock = true,
    zoomLock = true,
    viewportOutlineColor = [255, 255, 255],
    viewportOutlineWidth = 10
  }) {
    super({ id, x, y, height, width });
    this.linkedIds = linkedIds;
    this.panLock = panLock;
    this.zoomLock = zoomLock;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }

  filterViewState({ viewState, oldViewState, currentViewState }) {
    const { id: viewStateId } = viewState;
    const { id, height, width, linkedIds, panLock, zoomLock } = this;
    if (
      oldViewState &&
      linkedIds.indexOf(viewStateId) !== -1 &&
      (zoomLock || panLock)
    ) {
      const [currentX, currentY, currentZ = 0] = currentViewState.target;
      let zoom = getViewZoom(currentViewState);
      let target = [currentX, currentY, currentZ];

      // Apply the leader's delta so an intentional offset (from unlocked pan/zoom)
      // between panels is preserved while locked.
      if (zoomLock) {
        const dZoom = getViewZoom(viewState) - getViewZoom(oldViewState);
        zoom = zoom + dZoom;
      }
      if (panLock) {
        const [oldX, oldY] = oldViewState.target;
        const [newX, newY] = viewState.target;
        target = [currentX + (newX - oldX), currentY + (newY - oldY), currentZ];
      }

      return { id, target, zoom, height, width };
    }
    if (viewState.id === id) {
      return {
        id,
        target: viewState.target,
        zoom: getViewZoom(viewState),
        height,
        width
      };
    }
    return {
      id,
      target: currentViewState.target,
      zoom: getViewZoom(currentViewState),
      height,
      width
    };
  }

  getLayers({ props, viewStates }) {
    const { id, viewportOutlineColor, viewportOutlineWidth, height, width } =
      this;
    const layerViewState = viewStates[id];
    const boundingBox = makeBoundingBox({ ...layerViewState, height, width });
    const layers = [getImageLayer(id, props)];

    const border = new PolygonLayer({
      id: `viewport-outline-${getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -getViewZoom(layerViewState)
    });
    layers.push(border);

    return layers;
  }
}
