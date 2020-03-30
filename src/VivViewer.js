import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { VivViewerLayer, StaticImageLayer } from './layers';
import OverviewLayer from './layers/OverviewLayer';

export default class VivViewer extends PureComponent {
  constructor(props) {
    super(props);
    const { initialViewState, loader } = this.props;
    const { numLevels } = loader;
    const { imageWidth, imageHeight } = loader.getRasterSize({
      z: 0
    });
    this.state = {
      viewState: {
        detail: { ...initialViewState, id: 'detail' },
        overview: {
          ...initialViewState,
          // The overview should be centered in view space coordinates.
          target: [imageWidth / 2, imageHeight / 2, 0],
          zoom: -(numLevels - 1),
          id: 'overview'
        }
      }
    };
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
  }

  // This prevents only the `draw` call of a layer from firing,
  // but not other layer lifecycle methods.  Nonetheless, it is
  // still useful.
  // eslint-disable-next-line class-methods-use-this
  layerFilter({ layer, viewport }) {
    if (layer.id.includes(viewport.id)) {
      // Draw the static layer in the overview
      return true;
    }
    return false;
  }

  _onViewStateChange({ viewId, viewState }) {
    // Save the view state and trigger rerender
    // only for changes to the `detail` view
    if (viewId === 'detail') {
      const { loader } = this.props;
      const { numLevels } = loader;
      const { imageWidth, imageHeight } = loader.getRasterSize({
        z: 0
      });
      const newViewState = {};
      newViewState.detail = viewState;
      newViewState.overview = {
        ...viewState,
        target: [imageWidth / 2, imageHeight / 2, 0],
        zoom: -(numLevels - 1)
      };
      this.setState({ viewState: newViewState });
    }
  }

  // For now this is hardcoded but in general we should look at
  // a proper structure for taking lists of configurations so that
  // we can handle multiple overlapping layers.
  // https://github.com/hubmapconsortium/vitessce-image-viewer/issues/107
  _renderLayers() {
    const { loader, overviewOn } = this.props;
    if (loader.isPyramid) {
      const layers = [
        new VivViewerLayer({
          id: `${loader.type}-detail`,
          // Because TileLayer is unique in updating on viewport changes,
          // it needs to be aware of what viewport it is rendering in -
          // layerFilter only handles `draw` calls.
          viewportId: 'detail',
          ...this.props
        })
      ];
      if (overviewOn) {
        const { viewHeight, viewWidth } = this.props;
        const { viewState } = this.state;
        const viewport = new OrthographicView().makeViewport({
          // From the current `detail` viewState, we need its projection matrix (actually the inverse).
          viewState: viewState.detail,
          height: viewHeight,
          width: viewWidth
        });
        // Use the inverse of the projection matrix to map screen to the view space.
        const boundingBox = [
          viewport.unproject([0, 0]),
          viewport.unproject([viewport.width, 0]),
          viewport.unproject([viewport.width, viewport.height]),
          viewport.unproject([0, viewport.height])
        ];
        layers.push(
          new OverviewLayer(this.props, {
            id: `${loader.type}-overview`,
            boundingBox,
            ...this.props
          })
        );
        return layers;
      }
      return layers;
    }

    return new StaticImageLayer({
      id: `StaticImageLayer-${loader.type}-detail`,
      ...this.props
    });
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const { loader, overviewOn } = this.props;
    const { numLevels } = loader;
    const { imageWidth, imageHeight } = loader.getRasterSize({
      z: 0
    });
    const views = [
      new OrthographicView({
        id: 'detail',
        controller: true,
        height: this.props.viewHeight,
        width: this.props.viewWidth
      })
    ];
    if (loader.isPyramid && overviewOn) {
      /* eslint-disable no-bitwise */
      views.push(
        new OrthographicView({
          id: 'overview',
          controller: false,
          // There's probably a better way to do this, but I think there needs to be
          // some investigation into padding - look at the tiff vs zarr maps.
          height: imageHeight >> (numLevels - 1),
          width: imageWidth >> (numLevels - 1),
          x: this.props.viewWidth - (imageWidth >> (numLevels - 1)) - 25,
          y: this.props.viewHeight - (imageHeight >> (numLevels - 1)) - 25,
          clear: true
        })
      );
      /* eslint-disable no-bitwise */
    }
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layerFilter={this.layerFilter}
        layers={this._renderLayers()}
        onViewStateChange={this._onViewStateChange}
        views={views}
        viewState={this.state.viewState}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
