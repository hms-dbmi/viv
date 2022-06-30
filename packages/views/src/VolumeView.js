import { OrbitView } from '@deck.gl/core';
import { VolumeLayer } from '@vivjs/layers';
import { getVivId } from './utils';
import VivView from './VivView';

/**
 * This class generates a VolumeLayer and a view for use in the VivViewer as volumetric rendering.
 * @param {Object} args
 * @param {Array<number>} args.target Centered target for the camera (used if useFixedAxis is true)
 * @param {Boolean} args.useFixedAxis Whether or not to fix the axis of the camera.
 * */
export default class VolumeView extends VivView {
  constructor({ target, useFixedAxis, ...args }) {
    super(args);
    this.target = target;
    this.useFixedAxis = useFixedAxis;
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
    const { id, target, useFixedAxis } = this;
    return viewState.id === id
      ? {
          ...viewState,
          // fix the center of the camera if desired
          target: useFixedAxis ? target : viewState.target
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
