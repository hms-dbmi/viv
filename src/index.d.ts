/* eslint-disable no-unused-vars */
import { JSX, PureComponent } from 'react';
import { CompositeLayer, Layer } from '@deck.gl/core';

export const DTYPE_VALUES: {
  [type: string]: {
    format: any;
    dataFormat: any;
    max: number;
    TypedArray: any;
  };
};
export const MAX_SLIDERS_AND_CHANNELS: number;

export class ImageLayer extends CompositeLayer {
  constructor(...props);
  initializeState(): void;
  updateState({ changeFlags, props, oldProps }): void;
  getPickingInfo({ info, sourceLayer });
  renderLayers();
}

export class MultiscaleImageLayer extends CompositeLayer {
  constructor(...props);
  initializeState(): void;
  renderLayers(): any[];
}

export class ScaleBarLayer extends CompositeLayer {
  renderLayers(): any[];
}

export class XRLayer extends Layer {
  getShaders();
  initializeState(): void;
  finalizeState(): void;
  updateState({ props, oldProps, changeFlags }): void;
  _getModel(gl);
  calculatePositions(attributes);
  draw({ uniforms });
  loadChannelTextures(channelData): void;
  dataToTexture(data, width, height);
}

export default class DetailView extends VivView {
  getLayers({ props, viewStates }): any[];
  filterViewState({ viewState, currentViewState });
}

export class OverviewView extends VivView {
  margin: number;
  loader: any;
  position: string;
  detailHeight: any;
  detailWidth: any;
  clickCenter: boolean;
  height: any;
  width: any;
  scale: any;
  _imageWidth: any;
  _imageHeight: any;
  constructor({
    initialViewState,
    loader,
    detailHeight,
    detailWidth,
    scale,
    margin,
    position,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight,
    clickCenter
  }: {
    initialViewState: any;
    loader: any;
    detailHeight: any;
    detailWidth: any;
    scale?: number;
    margin?: number;
    position?: string;
    minimumWidth?: number;
    maximumWidth?: number;
    minimumHeight?: number;
    maximumHeight?: number;
    clickCenter?: boolean;
  });
  _setHeightWidthScale({
    detailWidth,
    detailHeight,
    scale,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight
  }): void;
  _setXY();
  getDeckGlView();
  filterViewState({ viewState });
  getLayers({ viewStates, props }): any[];
}

export default class SideBySideView extends VivView {
  constructor({
    initialViewState,
    x,
    y,
    height,
    width,
    linkedIds,
    panLock,
    zoomLock,
    viewportOutlineColor,
    viewportOutlineWidth
  }: {
    initialViewState: any;
    x: any;
    y: any;
    height: any;
    width: any;
    linkedIds?: any[];
    panLock?: boolean;
    zoomLock?: boolean;
    viewportOutlineColor?: number[];
    viewportOutlineWidth?: number;
  });
}

export class VivView {
  width: number;
  height: number;
  initialViewState: any;
  id: string;
  x: number;
  y: number;
  constructor({
    initialViewState,
    x,
    y,
    height,
    width
  }: {
    initialViewState: any;
    x?: number;
    y?: number;
    height: any;
    width: any;
  });
  getDeckGlView();
  filterViewState({ viewState });
  getLayers({ viewStates, props });
}

export const PictureInPictureViewer: (props: {
  sliderValues: any[];
  colorValues: any[];
  channelIsOn: any[];
  colormap: string;
  loader: any;
  loaderSelection: any[];
  overview: any;
  overviewOn: boolean;
  hoverHooks: any;
  initialViewState: any;
  height: number;
  width: number;
  isLensOn: boolean;
  lensSelection: number;
  lensRadius: number;
  lensBorderColor: any[];
  lensBorderRadius: number;
  lensBorderRadius: number;
  clickCenter: boolean;
  onViewStateChange: any;
}) => JSX.Element;

export const SideBySideViewer: (props: {
  sliderValues: any[];
  colorValues: any[];
  channelIsOn: any[];
  colormap: string;
  loader: any;
  loaderSelection: any[];
  zoomLock: boolean;
  panLock: boolean;
  initialViewState: any;
  height: number;
  width: number;
  isLensOn: boolean;
  lensSelection: number;
  lensBorderColor: any[];
  lensBorderRadius: number;
  onViewStateChange: any;
}) => JSX.Element;

export class VivViewer extends PureComponent<VivViewerProps> {
  constructor(props: VivViewerProps);
  layerFilter({ layer, viewport }): boolean;
  _onViewStateChange({ viewId, viewState, interactionState, oldViewState });
  static getDerivedStateFromProps(props, prevState);
  onHover({ sourceLayer, coordinate, layer });
  _renderLayers();
  render(): JSX.Element;
}

export default class HTTPStore {
  constructor(url: any, options?: {});
  getItem(key: any, options?: {}): Promise<ArrayBuffer>;
}

export default class OMETiffLoader {
  constructor({ tiff, pool, firstImage, omexmlString, offsets });
  _getIFDIndex({
    z,
    channel,
    time
  }: {
    z: number;
    time: number;
    channel: string;
  }): number;
  onTileError(err: Error): void;
  getTile({
    x,
    y,
    z,
    loaderSelection,
    signal
  }: {
    x: number;
    y: number;
    z: number;
    loaderSelection: any[];
    signal: any;
  }): any;
  getRaster({ z, loaderSelection }: { z: number; loaderSelection: any[] }): any;
  getRasterSize({ z }: { z: number }): any;
  getMetadata();
  _getChannel({ image, x, y, z, signal }): Promise<any>;
  _tileInBounds({ x, y, z }): boolean;
  _parseIFD(index): void;
  _getTileExtent({ x, y, z });
}

export default class ZarrLoader {
  constructor({
    data,
    dimensions,
    isRgb,
    scale,
    translate
  }: {
    data: any;
    dimensions: any;
    isRgb: any;
    scale?: number;
    translate?: {
      x: number;
      y: number;
    };
  });
  get isPyramid(): boolean;
  get base();
  getTile({
    x,
    y,
    z,
    loaderSelection,
    signal
  }: {
    x: number;
    y: number;
    z: number;
    loaderSelection: any[];
    signal: any;
  }): any;
  getRaster({ z, loaderSelection });
  onTileError(err: Error): void;
  getRasterSize({ z }: { z: number }): any;
  getMetadata();
  _getSource(z);
  _serializeSelection(selection): any[];
}

export function createBioformatsZarrLoader({
  source,
  fetchOptions
}: {
  source: string | File[];
  fetchOptions?: any;
}): Promise<ZarrLoader>;

export function createOMETiffLoader({
  urlOrFile,
  offsets,
  headers
}: {
  urlOrFile: string;
  offsets?: any[];
  headers?: any;
}): Promise<OMETiffLoader>;

export function createZarrLoader({
  url,
  dimensions,
  isPyramid,
  isRgb,
  scale,
  translate
}): Promise<ZarrLoader>;

export function getChannelStats({
  loader,
  loaderSelection
}: {
  loader: any;
  loaderSelection: any[];
}): any[];

export function getDefaultInitialViewState(loader, viewSize);

type VivViewerProps = {
  layerProps: any;
  randomize?: any;
  views: any[];
  onViewStateChange?: any;
  hoverHooks?: { handleValue?: any };
};
