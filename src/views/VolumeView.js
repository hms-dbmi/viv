import { OrbitView } from '@deck.gl/core';
import { VolumeLayer } from '../layers';
import { getVivId } from './utils';
import VivView from './VivView';

/**
 * This class generates a VolumeLayer and a view for use in the VivViewer as volumetric rendering.
 * */
export default class VolumeView extends VivView {
  constructor({ target, ...args }) {
    super(args);
    this.target = target;
  }

  getDeckGlView() {
    const { height, width, id, x, y } = this;
    return new OrbitView({
      id,
      controller: true,
      height,
      width,
      x,
      y,
      orbitAxis: 'Y'
    });
  }

  filterViewState({ viewState }) {
    const { id, target } = this;
    return viewState.id === id
      ? {
          ...viewState,
          // fix the center of the camera
          target
        }
      : null;
  }

  getLayers({ props }) {
    const { loader } = props;
    const { id } = this;

    const layers = [
      new VolumeLayer(props, {
        id: `${loader.type}${getVivId(id)}`
      })
    ];

    return layers;
  }
}
