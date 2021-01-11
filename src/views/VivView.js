// eslint-disable-next-line max-classes-per-file
import { OrthographicView } from '@deck.gl/core';

/**
 * This class generates a layer and a view for use in the VivViewer
 * @param {Object} args
 * @param {Object} args.initialViewState ViewState object: { target: [x, y, 0], zoom: -zoom }.
 * @param {Object} args.height Width of the view.
 * @param {Object} args.width Height of the view.
 * @param {string} args.id Id for the current view
 * @param {number} args.x X (top-left) location on the screen for the current view
 * @param {number} args.y Y (top-left) location on the screen for the current view
 */
export default class VivView {
  constructor({ initialViewState, x = 0, y = 0, height, width }) {
    const { id } = initialViewState;
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
   * @param {Object} args
   * @param {ViewState} args.ViewState ViewState object.
   * @returns {ViewState} ViewState for this class (or null by default if the ids do not match).
   */
  filterViewState({ viewState }) {
    const { id, height, width } = this;
    return viewState.id === id ? { height, width, ...viewState } : null;
  }

  /**
   * Create a layer for this instance.
   * @param {Object} args
   * @param {ViewState} args.viewStates ViewStates for all current views.
   * @param {number} args.props Props for this instance.
   * @returns {Layer} Instance of a layer.
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  getLayers({ viewStates, props }) {}
}
