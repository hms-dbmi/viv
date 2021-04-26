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
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [
      new VolumeLayer(props, {
        id: `${loader.type}${getVivId(id)}`
      })
    ];
    const source = loader[0];
    const { labels, shape } = source;
    // Inspect the first pixel source for physical sizes
    if (
      source?.meta?.physicalSizes?.x &&
      source?.meta?.physicalSizes?.y &&
      source?.meta?.physicalSizes?.z
    ) {
      const axes = ['x', 'y', 'z'];
      // Volumes, if this information is present, have been scaled so that the minimum size is the per-pixel size.
      const sizes = axes.map(axis => source.meta.physicalSizes[axis].size);
      const minSize = Math.min(...sizes);
      const minAxis = axes.find(
        axis => source.meta.physicalSizes[axis].size === minSize
      );
      const ratios = sizes.map(size => size / minSize);
      const minSizes = axes.map(_ => minSize);
      const units = axes.map(_ => source.meta.physicalSizes[minAxis].unit);
      layers.push(
        new AxesLayer3D({
          id: getVivId(id),
          loader,
          units,
          sizes: minSizes,
          shape: [
            ratios[0] * shape[labels.indexOf('x')],
            ratios[1] * shape[labels.indexOf('y')],
            ratios[2] * shape[labels.indexOf('z')]
          ],
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }
}
