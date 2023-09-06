import { ScaleBarLayer } from '@vivjs/layers';
import VivView from './VivView';
import { getImageLayer, getVivId } from './utils';
import { OVERVIEW_VIEW_ID } from './OverviewView';

export const DETAIL_VIEW_ID = 'detail';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {boolean=} args.snapScaleBar If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
export default class DetailView extends VivView {
  constructor({ id, x = 0, y = 0, height, width, snapScaleBar = false }) {
    super({ id, x, y, height, width });
    this.snapScaleBar = snapScaleBar;
  }

  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [getImageLayer(id, props)];

    // Inspect the first pixel source for physical sizes
    if (loader[0]?.meta?.physicalSizes?.x) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          snap: this.snapScaleBar,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
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
