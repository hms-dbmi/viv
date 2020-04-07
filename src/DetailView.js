import { VivViewerLayer } from './layers';
import VivView from './VivView';

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
