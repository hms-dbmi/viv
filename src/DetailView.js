import { VivViewerLayer } from './layers';
import VivView from './VivView';

export default class OverviewViewport extends VivView {
  // eslint-disable-next-line class-methods-use-this
  getViewState(viewState) {
    return viewState;
  }

  getLayer({ props }) {
    const { loader } = props;
    const { id } = this;
    return new VivViewerLayer(props, {
      id: `${loader.type}-${id}`
    });
  }
}
