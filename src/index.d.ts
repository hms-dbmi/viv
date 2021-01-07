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

// Layers need to declare a constructor without deck.gl typings:
// https://www.npmjs.com/package/@danmarshall/deckgl-typings

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
  constructor(...props);
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

type OverviewViewProps = {
  initialViewState: any;
  loader: any;
  detailHeight: number;
  detailWidth: number;
  scale?: number;
  margin?: number;
  position?: string;
  minimumWidth?: number;
  maximumWidth?: number;
  minimumHeight?: number;
  maximumHeight?: number;
  clickCenter?: boolean;
};

export class OverviewView extends VivView {
  margin: number;
  loader: any;
  position: string;
  detailHeight: number;
  detailWidth: number;
  clickCenter: boolean;
  height: number;
  width: number;
  scale: number;
  _imageWidth: number;
  _imageHeight: number;
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
  }: OverviewViewProps);
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

type SideBySideViewProps = {
  initialViewState: any;
  x: number;
  y: number;
  height: number;
  width: number;
  linkedIds?: any[];
  panLock?: boolean;
  zoomLock?: boolean;
  viewportOutlineColor?: number[];
  viewportOutlineWidth?: number;
};

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
  }: SideBySideViewProps);
}

type VivViewProps = {
  initialViewState: any;
  x?: number;
  y?: number;
  height: any;
  width: any;
};

export class VivView {
  width: number;
  height: number;
  initialViewState: any;
  id: string;
  x: number;
  y: number;
  constructor({ initialViewState, x, y, height, width }: VivViewProps);
  getDeckGlView();
  filterViewState({ viewState });
  getLayers({ viewStates, props });
}

type PictureInPictureViewerProps = {
  sliderValues: number[][];
  colorValues: number[][];
  channelIsOn: boolean[];
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
  lensBorderColor: number[];
  lensBorderRadius: number;
  lensBorderRadius: number;
  clickCenter: boolean;
  onViewStateChange: any;
};

export const PictureInPictureViewer: (
  props: PictureInPictureViewerProps
) => JSX.Element;

type SideBySideViewerProps = {
  sliderValues: number[][];
  colorValues: number[][];
  channelIsOn: boolean[];
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
  lensBorderColor: number[];
  lensBorderRadius: number;
  onViewStateChange: any;
};

export const SideBySideViewer: (props: SideBySideViewerProps) => JSX.Element;

type VivViewerProps = {
  layerProps: any;
  randomize?: any;
  views: any[];
  onViewStateChange?: any;
  hoverHooks?: { handleValue?: any };
};

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
  }): Promise<any>;
  getRaster({
    z,
    loaderSelection
  }: {
    z: number;
    loaderSelection: any[];
  }): Promise<any>;
  getRasterSize({ z }: { z: number }): { width: number; height: number };
  getMetadata();
  _getChannel({
    image,
    x,
    y,
    z,
    signal
  }: {
    image: any;
    x: number;
    y: number;
    z: number;
    signal: any;
  }): Promise<any>;
  _tileInBounds({ x, y, z }: { x: number; y: number; z: number }): boolean;
  _parseIFD(index: number): void;
  _getTileExtent({
    x,
    y,
    z
  }: {
    x: number;
    y: number;
    z: number;
  }): { width: number; height: number };
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
  }): Promise<any>;
  getRaster({ z, loaderSelection }): Promise<any>;
  onTileError(err: Error): void;
  getRasterSize({ z }: { z: number }): { width: number; height: number };
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
