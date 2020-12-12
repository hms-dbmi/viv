import {
  MultiscaleImageLayer,
  ImageLayer,
  ScaleBarLayer,
  ArrayBitmapLayer,
  XRLayer
} from '../layers';
import VivView from './VivView';
import { getVivId } from './utils';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * */
export default class DetailView extends VivView {
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [];
    const subLayer =
      loader.isInterleaved && loader.isRgb ? ArrayBitmapLayer : XRLayer;
    const detailLayer = loader.isPyramid
      ? new MultiscaleImageLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id,
          subLayer
        })
      : new ImageLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id,
          subLayer
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
            viewState: { ...layerViewState, height, width }
          })
        );
      }
    }

    return layers;
  }
}
