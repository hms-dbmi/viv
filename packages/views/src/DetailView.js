import { OVERVIEW_VIEW_ID } from './OverviewView';
import VivView from './VivView';
import { getImageLayer } from './utils';

export const DETAIL_VIEW_ID = 'detail';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * It takes the same arguments for its constructor as its base class VivView.
 *
 * Note: Scale bars are now rendered using ScaleBarView rather than as a layer.
 * Use ScaleBarView as a separate view if you want to display a scale bar.
 *
 * @param {Object} args
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
export default class DetailView extends VivView {
  constructor({ id, x = 0, y = 0, height, width }) {
    super({ id, x, y, height, width });
  }

  getLayers({ props }) {
    const { id } = this;
    return [getImageLayer(id, props)];
  }

  filterViewState({ viewState, currentViewState }) {
    if (viewState.id === OVERVIEW_VIEW_ID) {
      const { target } = viewState;
      if (target) {
        return { ...currentViewState, target };
      }
    }
    return super.filterViewState({ viewState });
  }
}
