import { ScaleBarLayer } from '../layers';
import VivView from './VivView';
import { getImageLayers, getVivId } from './utils';
import { OVERVIEW_VIEW_ID } from './OverviewView';

export const DETAIL_VIEW_ID = 'detail';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * It takes the same arguments for its constructor as its base class VivView.
 * */
export default class DetailView extends VivView {
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = getImageLayers(id, props);

    // Inspect the first pixel source for physical sizes
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
