import DeckGL from '@deck.gl/react';
import { getVivId, DETAIL_VIEW_ID, getDefaultInitialViewState, DetailView, OVERVIEW_VIEW_ID, OverviewView, SideBySideView, VolumeView } from '@vivjs/views';
import equal from 'fast-deep-equal';
import * as React from 'react';
import { ColorPaletteExtension, ColorPalette3DExtensions } from '@vivjs/extensions';

const areViewStatesEqual = (viewState, otherViewState) => {
  return otherViewState === viewState || viewState?.zoom === otherViewState?.zoom && viewState?.rotationX === otherViewState?.rotationX && viewState?.rotationOrbit === otherViewState?.rotationOrbit && equal(viewState?.target, otherViewState?.target);
};
class VivViewerWrapper extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewStates: {}
    };
    const { viewStates } = this.state;
    const { views, viewStates: initialViewStates } = this.props;
    views.forEach((view) => {
      viewStates[view.id] = view.filterViewState({
        viewState: initialViewStates.find((v) => v.id === view.id)
      });
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
    this.onHover = this.onHover.bind(this);
  }
  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {object} args
   * @param {object} args.layer Layer being updated.
   * @param {object} args.viewport Viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport.
   */
  layerFilter({ layer, viewport }) {
    return layer.id.includes(getVivId(viewport.id));
  }
  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL
   * (hence the need for storing viewState in state).
   */
  _onViewStateChange({ viewId, viewState, interactionState, oldViewState }) {
    const { views, onViewStateChange } = this.props;
    viewState = onViewStateChange?.({
      viewId,
      viewState,
      interactionState,
      oldViewState
    }) || viewState;
    this.setState((prevState) => {
      const viewStates = {};
      views.forEach((view) => {
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: { ...viewState, id: viewId },
          oldViewState,
          currentViewState
        });
      });
      return { viewStates };
    });
    return viewState;
  }
  componentDidUpdate(prevProps) {
    const { props } = this;
    const { views } = props;
    const viewStates = { ...this.state.viewStates };
    let anyChanged = false;
    views.forEach((view) => {
      const currViewState = props.viewStates?.find(
        (viewState) => viewState.id === view.id
      );
      if (!currViewState) {
        return;
      }
      const prevViewState = prevProps.viewStates?.find(
        (viewState) => viewState.id === view.id
      );
      if (areViewStatesEqual(currViewState, prevViewState)) {
        return;
      }
      anyChanged = true;
      const { height, width } = view;
      viewStates[view.id] = view.filterViewState({
        viewState: {
          ...currViewState,
          height,
          width,
          id: view.id
        }
      });
    });
    if (anyChanged) {
      this.setState({ viewStates });
    }
  }
  /**
   * This updates the viewStates' height and width with the newest height and
   * width on any call where the viewStates changes (i.e resize events),
   * using the previous state (falling back on the view's initial state) for target x and y, zoom level etc.
   */
  static getDerivedStateFromProps(props, prevState) {
    const { views, viewStates: viewStatesProps } = props;
    if (views.some(
      (view) => !prevState.viewStates[view.id] || view.height !== prevState.viewStates[view.id].height || view.width !== prevState.viewStates[view.id].width
    )) {
      const viewStates = {};
      views.forEach((view) => {
        const { height, width } = view;
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: {
            ...currentViewState || viewStatesProps.find((v) => v.id === view.id),
            height,
            width,
            id: view.id
          }
        });
      });
      return { viewStates };
    }
    return prevState;
  }
  onHover(info, event) {
    const { tile, coordinate, sourceLayer: layer } = info;
    const { onHover, hoverHooks } = this.props;
    if (onHover) {
      onHover(info, event);
    }
    if (!hoverHooks || !coordinate || !layer) {
      return null;
    }
    const { handleValue = () => {
    }, handleCoordnate = () => {
    } } = hoverHooks;
    let hoverData;
    if (layer.id.includes("Tiled")) {
      if (!tile?.content) {
        return null;
      }
      const {
        content,
        bbox,
        index: { z }
      } = tile;
      if (!content.data || !bbox) {
        return null;
      }
      const { data, width, height } = content;
      const { left, right, top, bottom } = bbox;
      const bounds = [
        left,
        data.height < layer.tileSize ? height : bottom,
        data.width < layer.tileSize ? width : right,
        top
      ];
      if (!data) {
        return null;
      }
      const layerZoomScale = Math.max(1, 2 ** Math.round(-z));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map((d) => d[coords]);
    } else {
      const { channelData } = layer.props;
      if (!channelData) {
        return null;
      }
      const { data, width, height } = channelData;
      if (!data || !width || !height) {
        return null;
      }
      const bounds = [0, height, width, 0];
      const { zoom } = layer.context.viewport;
      const layerZoomScale = Math.max(1, 2 ** Math.floor(-zoom));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map((d) => d[coords]);
    }
    handleValue(hoverData);
    handleCoordnate(coordinate);
  }
  /**
   * This renders the layers in the DeckGL context.
   */
  _renderLayers() {
    const { onHover } = this;
    const { viewStates } = this.state;
    const { views, layerProps } = this.props;
    return views.map(
      (view, i) => view.getLayers({
        viewStates,
        props: {
          ...layerProps[i],
          onHover
        }
      })
    );
  }
  render() {
    const { views, randomize, useDevicePixels = true, deckProps } = this.props;
    const { viewStates } = this.state;
    const deckGLViews = views.map((view) => view.getDeckGlView());
    if (randomize) {
      const random = Math.random();
      const holdFirstElement = deckGLViews[0];
      const randomWieghted = random * 1.49;
      const randomizedIndex = Math.round(randomWieghted * (views.length - 1));
      deckGLViews[0] = deckGLViews[randomizedIndex];
      deckGLViews[randomizedIndex] = holdFirstElement;
    }
    return /* @__PURE__ */ React.createElement(
      DeckGL,
      {
        ...deckProps ?? {},
        layerFilter: this.layerFilter,
        layers: deckProps?.layers === void 0 ? [...this._renderLayers()] : [...this._renderLayers(), ...deckProps.layers],
        onViewStateChange: this._onViewStateChange,
        views: deckGLViews,
        viewState: viewStates,
        useDevicePixels,
        getCursor: ({ isDragging }) => {
          return isDragging ? "grabbing" : "crosshair";
        }
      }
    );
  }
}
const VivViewer = (props) => /* @__PURE__ */ React.createElement(VivViewerWrapper, { ...props });

const PictureInPictureViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    overview,
    overviewOn,
    selections,
    hoverHooks = { handleValue: () => {
    }, handleCoordinate: () => {
    } },
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    clickCenter = true,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const detailViewState = viewStatesProp?.find((v) => v.id === DETAIL_VIEW_ID);
  const baseViewState = React.useMemo(() => {
    return detailViewState || getDefaultInitialViewState(loader, { height, width }, 0.5);
  }, [loader, detailViewState]);
  const detailView = new DetailView({
    id: DETAIL_VIEW_ID,
    height,
    width,
    snapScaleBar
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  const viewStates = [{ ...baseViewState, id: DETAIL_VIEW_ID }];
  if (overviewOn && loader) {
    const overviewViewState = viewStatesProp?.find(
      (v) => v.id === OVERVIEW_VIEW_ID
    ) || { ...baseViewState, id: OVERVIEW_VIEW_ID };
    const overviewView = new OverviewView({
      id: OVERVIEW_VIEW_ID,
      loader,
      detailHeight: height,
      detailWidth: width,
      clickCenter,
      ...overview
    });
    views.push(overviewView);
    layerProps.push({ ...layerConfig, lensEnabled: false });
    viewStates.push(overviewViewState);
  }
  if (!loader)
    return null;
  return /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      viewStates,
      hoverHooks,
      onViewStateChange,
      onHover,
      deckProps
    }
  );
};

const SideBySideViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    panLock,
    selections,
    zoomLock,
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const leftViewState = viewStatesProp?.find((v) => v.id === "left");
  const rightViewState = viewStatesProp?.find((v) => v.id === "right");
  const viewStates = React.useMemo(() => {
    if (leftViewState && rightViewState) {
      return viewStatesProp;
    }
    const defaultViewState = getDefaultInitialViewState(
      loader,
      { height, width: width / 2 },
      0.5
    );
    return [
      leftViewState || { ...defaultViewState, id: "left" },
      rightViewState || { ...defaultViewState, id: "right" }
    ];
  }, [loader, leftViewState, rightViewState]);
  const detailViewLeft = new SideBySideView({
    id: "left",
    linkedIds: ["right"],
    panLock,
    zoomLock,
    height,
    width: width / 2,
    snapScaleBar
  });
  const detailViewRight = new SideBySideView({
    id: "right",
    x: width / 2,
    linkedIds: ["left"],
    panLock,
    zoomLock,
    height,
    width: width / 2,
    snapScaleBar
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];
  return loader ? /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      randomize: true,
      onViewStateChange,
      onHover,
      viewStates,
      deckProps
    }
  ) : null;
};

const VolumeViewer = (props) => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    resolution = Math.max(0, loader.length - 1),
    modelMatrix,
    onViewStateChange,
    xSlice = null,
    ySlice = null,
    zSlice = null,
    onViewportLoad,
    height: screenHeight,
    width: screenWidth,
    viewStates: viewStatesProp,
    clippingPlanes = [],
    useFixedAxis = true,
    extensions = [new ColorPalette3DExtensions.AdditiveBlendExtension()]
  } = props;
  const volumeViewState = viewStatesProp?.find((state) => state?.id === "3d");
  const initialViewState = React.useMemo(() => {
    if (volumeViewState) {
      return volumeViewState;
    }
    const viewState = getDefaultInitialViewState(
      loader,
      { height: screenHeight, width: screenWidth },
      1,
      true,
      modelMatrix
    );
    return {
      ...viewState,
      rotationX: 0,
      rotationOrbit: 0
    };
  }, [loader, resolution, modelMatrix]);
  const viewStates = [volumeViewState || { ...initialViewState, id: "3d" }];
  const volumeView = new VolumeView({
    id: "3d",
    target: viewStates[0].target,
    useFixedAxis
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    extensions,
    modelMatrix,
    // Slightly delay to avoid issues with a render in the middle of a deck.gl layer state update.
    onViewportLoad: () => setTimeout(onViewportLoad, 0),
    clippingPlanes
  };
  const views = [volumeView];
  const layerProps = [layerConfig];
  return loader ? /* @__PURE__ */ React.createElement(
    VivViewer,
    {
      layerProps,
      views,
      viewStates,
      onViewStateChange,
      useDevicePixels: false
    }
  ) : null;
};

export { PictureInPictureViewer, SideBySideViewer, VivViewer, VolumeViewer };
