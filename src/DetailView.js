import { VivViewerLayer } from './layers';
import VivView from './VivView';

/**
 * This class generates a VivViewerlayer and a view for use in the VivViewer as a detailed view
 * */
export default class DetailView extends VivView {
  getLayer({ props }) {
    const { loader } = props;
    const { id } = this;
    return new VivViewerLayer(props, {
      id: `${loader.type}-${id}`,
      viewportId: id
    });
  }
}
