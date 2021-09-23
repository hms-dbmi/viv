import { LayerExtension } from '@deck.gl/core';

export default class LensExtension extends LayerExtension {
  initializeState(context, extension) {
    this.setState({
      unprojectLensBounds: [0, 0, 0, 0]
    });
    // eslint-disable-next-line no-param-reassign
    extension.onMouseMove = () => {
      const layer = this.getCurrentLayer();
      const { viewportId, lensRadius } = layer.props;
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
        pointermove: extension.onMouseMove,
        pointerleave: extension.onMouseMove,
        wheel: extension.onMouseMove
      });
    }
  }

  finalizeState(extension) {
    // Remove event listeners
    if (this.context.deck) {
      this.context.deck.eventManager.off({
        pointermove: extension.onMouseMove,
        pointerleave: extension.onMouseMove,
        wheel: extension.onMouseMove
      });
    }
  }
}

LensExtension.extensionName = 'LensExtension';
