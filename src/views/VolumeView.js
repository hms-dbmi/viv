import { OrbitView } from '@deck.gl/core';
import { VolumeLayer, AxesLayer3D } from '../layers';
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

  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { shape } = loader[0];
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [
      new VolumeLayer(props, {
        id: `${loader.type}${getVivId(id)}`
      })
    ];
    // Inspect the first pixel source for physical sizes
    if (
      loader[0]?.meta?.physicalSizes?.x &&
      loader[0]?.meta?.physicalSizes?.y &&
      loader[0]?.meta?.physicalSizes?.z
    ) {
      const axes = ['x', 'y', 'z'];
      // Volumes, if this information is present, have been scaled so that the minimum size is the per-pixel size.
      const sizes = axes.map(axis => loader[0].meta.physicalSizes[axis].size);
      const minSize = Math.min(...sizes);
      const minAxis = axes.find(
        axis => loader[0].meta.physicalSizes[axis].size === minSize
      );
      const minSizes = axes.map(_ => minSize);
      const units = axes.map(_ => loader[0].meta.physicalSizes[minAxis].unit);
      layers.push(
        new AxesLayer3D({
          id: getVivId(id),
          loader,
          units,
          sizes: minSizes,
          shape,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }
}
