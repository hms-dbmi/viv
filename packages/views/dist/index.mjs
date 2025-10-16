import { getPhysicalSizeScalingMatrix, MultiscaleImageLayer, ImageLayer, makeBoundingBox, OverviewLayer, ScaleBarLayer, VolumeLayer } from '@vivjs/layers';
import { OrthographicView, Controller, COORDINATE_SYSTEM, OrbitView } from '@deck.gl/core';
import { getImageSize } from '@vivjs/loaders';
import { Matrix4 } from '@math.gl/core';
import { PolygonLayer } from '@deck.gl/layers';

class VivView {
  constructor({ id, x = 0, y = 0, height, width }) {
    this.width = width;
    this.height = height;
    this.id = id;
    this.x = x;
    this.y = y;
  }
  /**
   * Create a DeckGL view based on this class.
   * @returns {View} The DeckGL View for this class.
   */
  getDeckGlView() {
    return new OrthographicView({
      controller: true,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y
    });
  }
  /**
   * Create a viewState for this class, checking the id to make sure this class and veiwState match.
   * @param {Object} args
   * @param {object} [args.viewState] incoming ViewState object from deck.gl update.
   * @param {object} [args.oldViewState] old ViewState object from deck.gl.
   * @param {object} [args.currentViewState] current ViewState object in react state.
   * @returns {?object} ViewState for this class (or null by default if the ids do not match).
   */
  filterViewState({ viewState }) {
    const { id, height, width } = this;
    return viewState.id === id ? { height, width, ...viewState } : null;
  }
  /**
   * Create a layer for this instance.
   * @param {Object} args
   * @param {Object<string,Object>} args.viewStates ViewStates for all current views.
   * @param {Object} args.props Props for this instance.
   * @returns {Layer} Instance of a layer.
   */
  getLayers({ viewStates, props }) {
  }
}

function getVivId(id) {
  return `-#${id}#`;
}
function getDefaultInitialViewState(loader, viewSize, zoomBackOff = 0, use3d = false, modelMatrix) {
  const source = Array.isArray(loader) ? loader[0] : loader;
  const { width: pixelWidth, height: pixelHeight } = getImageSize(source);
  const scale = (modelMatrix || new Matrix4()).getScale();
  const [trueWidth, trueHeight] = [
    scale[0] * pixelWidth,
    scale[1] * pixelHeight
  ];
  const depth = source.shape[source.labels.indexOf("z")];
  const zoom = Math.log2(
    Math.min(viewSize.width / trueWidth, viewSize.height / trueHeight)
  ) - zoomBackOff;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const loaderInitialViewState = {
    target: (modelMatrix || new Matrix4()).transformPoint(
      (use3d ? physicalSizeScalingMatrix : new Matrix4()).transformPoint([
        pixelWidth / 2,
        pixelHeight / 2,
        use3d ? depth / 2 : 0
      ])
    ),
    zoom
  };
  return loaderInitialViewState;
}
function getImageLayer(id, props) {
  const { loader } = props;
  const sourceName = loader[0]?.constructor?.name;
  const Layer = loader.length > 1 ? MultiscaleImageLayer : ImageLayer;
  const layerLoader = loader.length > 1 ? loader : loader[0];
  return new Layer({
    ...props,
    id: `${sourceName}${getVivId(id)}`,
    viewportId: id,
    loader: layerLoader
  });
}

const OVERVIEW_VIEW_ID = "overview";
class OverviewController extends Controller {
  constructor(props) {
    super(props);
    this.events = ["click"];
  }
  handleEvent(event) {
    if (event.type !== "click") {
      return;
    }
    let [x, y] = this.getCenter(event);
    const { width, height, zoom, scale } = this.props;
    if (x < 0 || y < 0 || x > width || y > height) {
      return;
    }
    const scaleFactor = 1 / (2 ** zoom * scale);
    x *= scaleFactor;
    y *= scaleFactor;
    if (this.onViewStateChange) {
      this.onViewStateChange({ viewState: { target: [x, y, 0] } });
    }
  }
}
class OverviewView extends VivView {
  constructor({
    id,
    loader,
    detailHeight,
    detailWidth,
    scale = 0.2,
    margin = 25,
    position = "bottom-right",
    minimumWidth = 150,
    maximumWidth = 350,
    minimumHeight = 150,
    maximumHeight = 350,
    clickCenter = true
  }) {
    super({ id });
    this.margin = margin;
    this.loader = loader;
    this.position = position;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({
      detailWidth,
      detailHeight,
      scale,
      minimumWidth,
      maximumWidth,
      minimumHeight,
      maximumHeight
    });
    this._setXY();
    this.clickCenter = clickCenter;
  }
  /**
   * Set the image-pixel scale and height and width based on detail view.
   */
  _setHeightWidthScale({
    detailWidth,
    detailHeight,
    scale,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight
  }) {
    const numLevels = this.loader.length;
    const { width: rasterWidth, height: rasterHeight } = getImageSize(
      this.loader[0]
    );
    this._imageWidth = rasterWidth;
    this._imageHeight = rasterHeight;
    if (rasterWidth > rasterHeight) {
      const heightWidthRatio = rasterHeight / rasterWidth;
      this.width = Math.min(
        maximumWidth,
        Math.max(detailWidth * scale, minimumWidth)
      );
      this.height = this.width * heightWidthRatio;
      this.scale = 2 ** (numLevels - 1) / rasterWidth * this.width;
    } else {
      const widthHeightRatio = rasterWidth / rasterHeight;
      this.height = Math.min(
        maximumHeight,
        Math.max(detailHeight * scale, minimumHeight)
      );
      this.width = this.height * widthHeightRatio;
      this.scale = 2 ** (numLevels - 1) / rasterHeight * this.height;
    }
  }
  /**
   * Set the x and y (top left corner) of this overview relative to the detail.
   */
  _setXY() {
    const { height, width, margin, position, detailWidth, detailHeight } = this;
    switch (position) {
      case "bottom-right": {
        this.x = detailWidth - width - margin;
        this.y = detailHeight - height - margin;
        break;
      }
      case "top-right": {
        this.x = detailWidth - width - margin;
        this.y = margin;
        break;
      }
      case "top-left": {
        this.x = margin;
        this.y = margin;
        break;
      }
      case "bottom-left": {
        this.x = margin;
        this.y = detailHeight - height - margin;
        break;
      }
      default: {
        throw new Error(
          `overviewLocation prop needs to be one of ['bottom-right', 'top-right', 'top-left', 'bottom-left']`
        );
      }
    }
  }
  getDeckGlView() {
    const { scale, clickCenter } = this;
    const controller = clickCenter && { type: OverviewController, scale };
    return new OrthographicView({
      controller,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y,
      clear: true
    });
  }
  filterViewState({ viewState }) {
    const { _imageWidth, _imageHeight, scale } = this;
    return {
      ...viewState,
      height: this.height,
      width: this.width,
      id: this.id,
      target: [_imageWidth * scale / 2, _imageHeight * scale / 2, 0],
      zoom: -(this.loader.length - 1)
    };
  }
  getLayers({ viewStates, props }) {
    const { detail, overview } = viewStates;
    if (!detail) {
      throw new Error("Overview requires a viewState with id detail");
    }
    const boundingBox = makeBoundingBox(detail).map(
      (coords) => coords.map((e) => e * this.scale)
    );
    const overviewLayer = new OverviewLayer(props, {
      id: getVivId(this.id),
      boundingBox,
      overviewScale: this.scale,
      zoom: -overview.zoom
    });
    return [overviewLayer];
  }
}

const DETAIL_VIEW_ID = "detail";
class DetailView extends VivView {
  constructor({ id, x = 0, y = 0, height, width, snapScaleBar = false }) {
    super({ id, x, y, height, width });
    this.snapScaleBar = snapScaleBar;
  }
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [getImageLayer(id, props)];
    if (loader[0]?.meta?.physicalSizes?.x) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          snap: this.snapScaleBar,
          viewState: { ...layerViewState, height, width }
        })
      );
    }
    return layers;
  }
  filterViewState({ viewState, currentViewState }) {
    if (viewState.id === OVERVIEW_VIEW_ID) {
      const { target } = viewState;
      if (target) {
        return { ...currentViewState, target };
      }
    }
    return super.filterViewState({ viewState });
  }
}

class SideBySideView extends VivView {
  constructor({
    id,
    x = 0,
    y = 0,
    height,
    width,
    linkedIds = [],
    panLock = true,
    zoomLock = true,
    viewportOutlineColor = [255, 255, 255],
    viewportOutlineWidth = 10,
    snapScaleBar = false
  }) {
    super({ id, x, y, height, width });
    this.linkedIds = linkedIds;
    this.panLock = panLock;
    this.zoomLock = zoomLock;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
    this.snapScaleBar = snapScaleBar;
  }
  filterViewState({ viewState, oldViewState, currentViewState }) {
    const { id: viewStateId } = viewState;
    const { id, linkedIds, panLock, zoomLock } = this;
    if (oldViewState && linkedIds.indexOf(viewStateId) !== -1 && (zoomLock || panLock)) {
      const thisViewState = {
        height: currentViewState.height,
        width: currentViewState.width,
        target: [],
        zoom: null
      };
      const [currentX, currentY] = currentViewState.target;
      if (zoomLock) {
        const dZoom = viewState.zoom - oldViewState.zoom;
        thisViewState.zoom = currentViewState.zoom + dZoom;
      } else {
        thisViewState.zoom = currentViewState.zoom;
      }
      if (panLock) {
        const [oldX, oldY] = oldViewState.target;
        const [newX, newY] = viewState.target;
        const dx = newX - oldX;
        const dy = newY - oldY;
        thisViewState.target.push(currentX + dx);
        thisViewState.target.push(currentY + dy);
      } else {
        thisViewState.target.push(currentX);
        thisViewState.target.push(currentY);
      }
      return {
        id,
        target: thisViewState.target,
        zoom: thisViewState.zoom,
        height: thisViewState.height,
        width: thisViewState.width
      };
    }
    return viewState.id === id ? {
      id,
      target: viewState.target,
      zoom: viewState.zoom,
      height: viewState.height,
      width: viewState.width
    } : {
      id,
      target: currentViewState.target,
      zoom: currentViewState.zoom,
      height: currentViewState.height,
      width: currentViewState.width
    };
  }
  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, viewportOutlineColor, viewportOutlineWidth, height, width } = this;
    const layerViewState = viewStates[id];
    const boundingBox = makeBoundingBox({ ...layerViewState, height, width });
    const layers = [getImageLayer(id, props)];
    const border = new PolygonLayer({
      id: `viewport-outline-${getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: (f) => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -layerViewState.zoom
    });
    layers.push(border);
    if (loader[0]?.meta?.physicalSizes?.x) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          snap: this.snapScaleBar,
          viewState: { ...layerViewState, height, width }
        })
      );
    }
    return layers;
  }
}

class VolumeView extends VivView {
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
      orbitAxis: "Y"
    });
  }
  filterViewState({ viewState }) {
    const { id, target, useFixedAxis } = this;
    return viewState.id === id ? {
      ...viewState,
      // fix the center of the camera if desired
      target: useFixedAxis ? target : viewState.target
    } : null;
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

export { DETAIL_VIEW_ID, DetailView, OVERVIEW_VIEW_ID, OverviewView, SideBySideView, VivView, VolumeView, getDefaultInitialViewState, getVivId };
