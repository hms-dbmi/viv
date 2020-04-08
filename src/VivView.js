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
   * Create a boudning box from a viewport based on passed-in viewState.
   * @param {viewState} Object The viewState for a certain viewport
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
   * Create a DeckGL view based on this class.
   * @returns {View} The DeckGL View for this class.
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
   * Create a viewState for this class, checking the id to make sure this class and veiwState match.
   * @param {ViewState} Object A viewState object.
   * @returns {ViewState} The viewState for this class.
   */
  // eslint-disable-next-line class-methods-use-this
  getViewState(viewState) {
    const { id } = this;
    return viewState.id === id ? viewState : null;
  }

  /**
   * Create a layer for this instance.
   * @param {ViewState} Object The viewStates for all current views.
   * @param {number} props The props for this instnace
   * @returns {Layer} Instance of a layer
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  getLayer({ viewStates, props }) {}
}
