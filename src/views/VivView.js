import { OrthographicView } from '@deck.gl/core';

/**
 * This class generates a layer and a view for use in the VivViewer
 * @param {Object} viewState The viewState object
 * @param {string} id The id for the current view
 * @param {number} x The x (top-left) location on the screen for the current view
 * @param {number} y The y (top-left) location on the screen for the current view
 */
export default class VivView {
  constructor({ initialViewState, x = 0, y = 0 }) {
    const { height, width, id } = initialViewState;
    this.width = width;
    this.height = height;
    this.initialViewState = initialViewState;
    this.id = id;
    this.x = x;
    this.y = y;
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
   * @returns {ViewState} The viewState for this class (or null by default if the ids do not match).
   */
  // eslint-disable-next-line class-methods-use-this
  filterViewState({ viewState }) {
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
