import { VivViewerLayer, StaticImageLayer } from '../layers';
import VivView from './VivView';
import { getVivId } from './utils';

/**
 * This class generates a VivViewerLayer and a view for use in the VivViewer as a detailed view.
 * */
export default class DetailView extends VivView {
  getLayer({ props }) {
    const { loader } = props;
    const { id } = this;
    return loader.isPyramid
      ? new VivViewerLayer(props, {
          id: loader.type + getVivId(id),
          viewportId: id
        })
      : new StaticImageLayer(props, {
          id: loader.type + getVivId(id),
          viewportId: id
        });
  }
}
