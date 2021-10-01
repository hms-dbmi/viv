import { LayerExtension } from '@deck.gl/core';
import lens from './lens-module';

/**
 * This deck.gl extension allows for a lens that selectively shows one channel in its chosen color and then the others in white.
 * @param {Object} opts
 * @param {boolean=} opts.isLensOn Whether or not to use the lens.
 * @param {number=} opts.lensSelection Numeric index of the channel to be focused on by the lens.
 * @param {number=} opts.lensRadius Pixel radius of the lens (default: 100).
 * @param {Array.<number>=} opts.lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number=} opts.lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * */

export default class LensExtension extends LayerExtension {
  getShaders() {
    return {
      ...super.getShaders(),
      modules: [lens]
    };
  }

  initializeState(context, extension) {
    const layer = this.getCurrentLayer();
    // No need to run this on layers that don't have a `draw` call.
    if (layer.isComposite) {
      return;
    }
    // eslint-disable-next-line no-param-reassign
    const onMouseMove = () => {
      const { viewportId } = layer.props;
      const { lensRadius = 100 } = extension.opts;
      // If there is no viewportId, don't try to do anything.
      if (!viewportId) {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
        return;
      }
      const { mousePosition } = layer.context;
      const layerView = layer.context.deck.viewManager.views.filter(
        view => view.id === viewportId
      )[0];
      const viewState = layer.context.deck.viewManager.viewState[viewportId];
      const viewport = layerView.makeViewport({
        ...viewState,
        viewState
      });
      // If the mouse is in the viewport and the mousePosition exists, set
      // the state with the bounding box of the circle that will render as a lens.
      if (mousePosition && viewport.containsPixel(mousePosition)) {
        const offsetMousePosition = {
          x: mousePosition.x - viewport.x,
          y: mousePosition.y - viewport.y
        };
        const mousePositionBounds = [
          // left
          [offsetMousePosition.x - lensRadius, offsetMousePosition.y],
          // bottom
          [offsetMousePosition.x, offsetMousePosition.y + lensRadius],
          // right
          [offsetMousePosition.x + lensRadius, offsetMousePosition.y],
          // top
          [offsetMousePosition.x, offsetMousePosition.y - lensRadius]
        ];
        // Unproject from screen to world coordinates.
        const unprojectLensBounds = mousePositionBounds.map(
          (bounds, i) => viewport.unproject(bounds)[i % 2]
        );
        layer.setState({ unprojectLensBounds });
      } else {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
      }
    };
    if (this.context.deck) {
      this.context.deck.eventManager.on({
        pointermove: onMouseMove,
        pointerleave: onMouseMove,
        wheel: onMouseMove
      });
    }
    this.setState({ onMouseMove, unprojectLensBounds: [0, 0, 0, 0] });
  }

  draw(params, extension) {
    const { bounds } = this.props;
    const { unprojectLensBounds } = this.state;
    const {
      isLensOn,
      lensSelection,
      lensBorderColor = [255, 255, 255],
      lensBorderRadius = 0.02
    } = extension.opts;
    // Creating a unit-square scaled intersection box for rendering the lens.
    // It is ok if these coordinates are outside the unit square since
    // we check membership in or out of the lens on the fragment shader.
    const [
      leftMouseBound,
      bottomMouseBound,
      rightMouseBound,
      topMouseBound
    ] = unprojectLensBounds;
    const [left, bottom, right, top] = bounds;
    const leftMouseBoundScaled = (leftMouseBound - left) / (right - left);
    const bottomMouseBoundScaled = (bottomMouseBound - top) / (bottom - top);
    const rightMouseBoundScaled = (rightMouseBound - left) / (right - left);
    const topMouseBoundScaled = (topMouseBound - top) / (bottom - top);
    const uniforms = {
      majorLensAxis: (rightMouseBoundScaled - leftMouseBoundScaled) / 2,
      minorLensAxis: (bottomMouseBoundScaled - topMouseBoundScaled) / 2,
      lensCenter: [
        (rightMouseBoundScaled + leftMouseBoundScaled) / 2,
        (bottomMouseBoundScaled + topMouseBoundScaled) / 2
      ],
      isLensOn,
      lensSelection,
      lensBorderColor,
      lensBorderRadius
    };
    // eslint-disable-next-line no-unused-expressions
    this.state.model?.setUniforms(uniforms);
  }

  finalizeState() {
    // Remove event listeners
    if (this.context.deck) {
      this.context.deck.eventManager.off({
        pointermove: this.state?.onMouseMove,
        pointerleave: this.state?.onMouseMove,
        wheel: this.state?.onMouseMove
      });
    }
  }
}

LensExtension.extensionName = 'LensExtension';
