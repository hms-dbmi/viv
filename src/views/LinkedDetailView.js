import { PolygonLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

import { VivViewerLayer } from '../layers';
import VivView from './VivView';
import { getVivId, makeBoundingBox } from './utils';

/**
 * This class generates a VivViewerLayer and a view for use in the SideBySideViewer.
 * It is linked with its other views as controlled by `linkedIds` and `panLock` parameters.
 * */
export default class LinkedDetailView extends VivView {
  constructor({
    initialViewState,
    x,
    y,
    linkedIds = [],
    panLock = true,
    zoomLock = true,
    viewportOutlineColor = [255, 190, 0],
    viewportOutlineWidth = 10
  }) {
    super({ initialViewState, x, y });
    this.linkedIds = linkedIds;
    this.panLock = panLock;
    this.zoomLock = zoomLock;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
  }

  filterViewState({ viewState, oldViewState, currentViewState }) {
    const { id: viewStateId } = viewState;
    const { id, linkedIds, panLock, zoomLock } = this;
    const thisViewState = { ...currentViewState };
    if (
      oldViewState &&
      linkedIds.indexOf(viewStateId) !== -1 &&
      (zoomLock || panLock)
    ) {
      if (zoomLock) {
        const dZoom = viewState.zoom - oldViewState.zoom;
        thisViewState.zoom += dZoom;
      }
      if (panLock) {
        const dx = viewState.target[0] - oldViewState.target[0];
        const dy = viewState.target[1] - oldViewState.target[1];
        thisViewState.target[0] += dx;
        thisViewState.target[1] += dy;
      }
      return thisViewState;
    }
    return viewState.id === id ? viewState : null;
  }

  getLayer({ props, viewStates }) {
    const { loader } = props;
    const { id, viewportOutlineColor, viewportOutlineWidth } = this;
    const thisViewState = viewStates[id];
    const boundingBox = makeBoundingBox(thisViewState);
    const tiledLayer = new VivViewerLayer(props, {
      id: loader.type + getVivId(id),
      viewportId: id
    });
    const border = new PolygonLayer({
      id: `viewport-outline-${loader.type + getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -thisViewState.zoom
    });
    return [tiledLayer, border];
  }
}
