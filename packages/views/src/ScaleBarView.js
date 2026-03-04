import { OrthographicView } from '@deck.gl/core';
import { ScaleBarLayer } from '@vivjs/layers';
import VivView from './VivView';
import { getVivId } from './utils';

export const SCALEBAR_VIEW_ID = 'scalebar';

/**
 * This class generates a ScaleBar view that displays a scale bar in a specific screen position.
 * The scale bar is positioned via the view mechanism and maintains a consistent visual position on screen.
 *
 * @param {Object} args
 * @param {string} args.id id for this VivView (should be unique)
 * @param {number} args.width Width of the view on screen
 * @param {number} args.height Height of the view on screen
 * @param {number=} args.x X (top-left) location on screen. Default is 0.
 * @param {number=} args.y Y (top-left) location on screen. Default is 0.
 * @param {string=} args.unit Physical unit size per pixel at full resolution. Default is ''.
 * @param {number=} args.size Physical size of a pixel. Default is 1.
 * @param {string=} args.position Position within the view ('bottom-right', 'top-right', 'top-left', 'bottom-left'). Default is 'bottom-right'.
 * @param {number=} args.length Length of the scale bar as a fraction (0-1) of view dimension. Default is 0.085.
 * @param {boolean=} args.snap If true, aligns the scale bar value to predefined intervals. Default is false.
 * @param {string=} args.imageViewId The id of the image view to track zoom from. Used to calculate correct scale values.
 */
export default class ScaleBarView extends VivView {
  constructor({
    id,
    width,
    height,
    loader,
    imageViewId,
    position = 'bottom-right',
    length = 0.05,
    snap = false,
  }) {
    super({ id, width, height });
    this.id = id;
    this.loader = loader;
    this.position = position;
    this.length = length;
    this.snap = snap;
    this.imageViewId = imageViewId;
  }

  getDeckGlView() {
    const { id, height, width, x, y } = this;
    return new OrthographicView({
      id,
      controller: false, // Disable interaction on scale bar view
      height,
      width,
      x: 0,
      y: 0
    });
  }

  filterViewState({ viewState }) {
    // Do not react to any view state changes - always return fixed viewState
    // This keeps the scale bar pinned to its screen location
    const { id, height, width } = this;
    return {
      ...viewState,
      id,
      height,
      width,
      target: [width / 2, height / 2, 0],
      zoom: 0
    };
  }

  getLayers({ viewStates }) {
    const {loader} = this;
    const layers = [];
    if (loader?.[0]?.meta?.physicalSizes?.x) {
        const {
          id,
          height,
          width,
          position,
          length,
          snap,
          imageViewId
        } = this;
        const { size, unit } = loader[0].meta.physicalSizes.x;

        // Get the image view's viewState to calculate correct scale
        const imageViewState = viewStates[imageViewId];
        const layerId = getVivId(id);
        layers.push(new ScaleBarLayer({
          id: layerId,
          unit,
          size,
          position,
          imageViewState: { ...imageViewState, height, width },
          length,
          snap,
          height,
          width
        }));
      }
    console.log(layers)
    return layers;
  }
    
}
