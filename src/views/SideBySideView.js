import { PolygonLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

import { ScaleBarLayer } from '../layers';
import VivView from './VivView';
import { getImageLayers, getVivId, makeBoundingBox } from './utils';
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
    const { id, linkedIds, panLock, zoomLock } = this;
    if (
      oldViewState &&
      linkedIds.indexOf(viewStateId) !== -1 &&
      (zoomLock || panLock)
    ) {
      const thisViewState = {
        height: currentViewState.height,
        width: currentViewState.width,
        target: [],
        zoom: null
      };
      const [currentX, currentY] = currentViewState.target;
      if (zoomLock) {
        const dZoom = viewState.zoom - oldViewState.zoom;
        thisViewState.zoom = currentViewState.zoom + dZoom;
      } else {
        thisViewState.zoom = currentViewState.zoom;
      }
      if (panLock) {
        const [oldX, oldY] = oldViewState.target;
        const [newX, newY] = viewState.target;
        const dx = newX - oldX;
        const dy = newY - oldY;
        thisViewState.target.push(currentX + dx);
        thisViewState.target.push(currentY + dy);
      } else {
        thisViewState.target.push(currentX);
        thisViewState.target.push(currentY);
      }
      return {
        id,
        target: thisViewState.target,
        zoom: thisViewState.zoom,
        height: thisViewState.height,
        width: thisViewState.width
      };
    }
    return viewState.id === id
      ? {
          id,
          target: viewState.target,
          zoom: viewState.zoom,
          height: viewState.height,
          width: viewState.width
        }
      : {
          id,
          target: currentViewState.target,
          zoom: currentViewState.zoom,
          height: currentViewState.height,
          width: currentViewState.width
        };
  }

  getLayers({ props, viewStates }) {
    const { loader } = props;
    const {
      id,
      viewportOutlineColor,
      viewportOutlineWidth,
      height,
      width
    } = this;
    const layerViewState = viewStates[id];
    const boundingBox = makeBoundingBox({ ...layerViewState, height, width });
    const layers = getImageLayers(id, props);

    const border = new PolygonLayer({
      id: `viewport-outline-${getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -layerViewState.zoom
    });
    layers.push(border);

    if (loader[0]?.meta?.physicalSizes?.x) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }
}
