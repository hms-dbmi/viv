import { MultiscaleImageLayer, ImageLayer, ScaleBarLayer } from '../layers';
import VivView from './VivView';
import { getVivId } from './utils';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * */
export default class DetailView extends VivView {
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id } = this;
    const layerViewState = viewStates[id];
    const layers = [];

    const detailLayer = loader.isPyramid
      ? new MultiscaleImageLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id
        })
      : new ImageLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id
        });
    layers.push(detailLayer);

    const { physicalSizes } = loader;
    if (physicalSizes) {
      const { x } = physicalSizes;
      const { unit, value } = x;
      if (unit && value) {
        layers.push(
          new ScaleBarLayer({
            id: getVivId(id),
            loader,
            unit,
            size: value,
            viewState: layerViewState
          })
        );
      }
    }

    return layers;
  }
}
