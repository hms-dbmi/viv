import { VivViewerLayer, StaticImageLayer, ScaleBarLayer } from '../layers';
import VivView from './VivView';
import { getVivId, makeBoundingBox } from './utils';

/**
 * This class generates a VivViewerLayer and a view for use in the VivViewer as a detailed view.
 * */
export default class DetailView extends VivView {
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { omexml } = loader;
    const { id } = this;
    const thisViewState = viewStates[id];
    const boundingBox = makeBoundingBox(thisViewState);
    const layer = loader.isPyramid
      ? new VivViewerLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id
        })
      : new StaticImageLayer(props, {
          id: `${loader.type}${getVivId(id)}`,
          viewportId: id
        });
    const scaleBarLayer = omexml
      ? new ScaleBarLayer({
          boundingBox,
          id: getVivId(id),
          zoom: thisViewState.zoom,
          loader
        })
      : null;
    return [layer, scaleBarLayer];
  }
}
