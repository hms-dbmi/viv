import { OrthographicView } from '@deck.gl/core';

/**
 * This class generates a layer and a view for use in the VivViewer
 * @param {number} viewState The viewState object
 * @param {string} id The id for the current view
 * @param {string} x The x location on the screen for the current view
 * @param {string} y The y location on the screen for the current view
 */
export default class VivView {
  constructor({ viewState, x = 0, y = 0 }) {
    const { height, width, id } = viewState;
    this.width = width;
    this.height = height;
    this.initViewState = viewState;
    this.id = id;
    this.x = x;
    this.y = y;
  }

  /**
   * Create a boudning box for the viewport and passed-in viewState.
   * @param {viewState} Object The viewState for all current viewports
   * @returns {View} The DeckGL View for this viewport
   */
  static makeBoundingBox(viewState) {
    const viewport = new OrthographicView().makeViewport({
      // From the current `detail` viewState, we need its projection matrix (actually the inverse).
      viewState,
      height: viewState.height,
      width: viewState.width
    });
    // Use the inverse of the projection matrix to map screen to the view space.
    return [
      viewport.unproject([0, 0]),
      viewport.unproject([viewport.width, 0]),
      viewport.unproject([viewport.width, viewport.height]),
      viewport.unproject([0, viewport.height])
    ];
  }

  /**
   * Set the x and y of the current view.
   */
  // eslint-disable-next-line class-methods-use-this
  setXY() {}

  /**
   * Create a view for the given viewport.
   * @returns {View} The DeckGL View for this viewport
   */
  getDeckGlView() {
    const { height, width, id, x, y } = this;
    return new OrthographicView({
      id,
      controller: true,
      height,
      width,
      x,
      y
    });
  }

  /**
   * Create a viewState for the given viewport.
   * @param {viewState} Object The viewState for all current viewports
   * @returns {viewState} The viewState for this viewport
   */
  // eslint-disable-next-line class-methods-use-this
  getViewState(viewState) {
    const { id } = this;
    return viewState.id === id ? viewState : null;
  }

  /**
   * Create a layer for the given viewport.
   * @param {viewState} Object The viewState for all current viewports
   * @param {number} props The props for this viewport
   * @returns {Layer} Instance of a layer
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  getLayer({ viewState, props }) {}
}
