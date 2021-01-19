import { MultiscaleImageLayer, ImageLayer, ScaleBarLayer } from '../layers';
import VivView from './VivView';
import { getVivId } from './utils';
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
    const layers = [];

    const detailLayer = 
      data.length === 1
        ? new ImageLayer(props, {
            id: getVivId(id),
            viewportId: id,
            loader: data[0], // loader is just a pixel source
          })
        : new MultiscaleImageLayer(props, {
            id: getVivId(id),
            viewportId: id,
            loader: data,
          });
    layers.push(detailLayer);

    // Inspect the first pixel source for physical sizes
    const { physicalSizes } = loader[0];
    if (physicalSizes?.x) {
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit: physicalSizes.x.unit,
          size: physicalSizes.x.value,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }

  /**
   * Create a viewState for this class, checking the id to make sure this class and viewState match.
   * @param {Object} args
   * @param {ViewState} args.ViewState ViewState object.
   * @returns {ViewState} ViewState for this class (or null by default if the ids do not match).
   */
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
