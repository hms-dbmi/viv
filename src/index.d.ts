// The next line is only needed if ESLint TypeScript plugins aren't specified.
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

interface VivViewProps {
  initialViewState: any;
  x?: number;
  y?: number;
  height: any;
  width: any;
}

export class VivView {
  width: number;
  height: number;
  initialViewState: any;
  id: string;
  x: number;
  y: number;
  constructor(props: VivViewProps);
  getDeckGlView();
  filterViewState({ viewState });
  getLayers({ viewStates, props });
}

export class DetailView extends VivView {
  getLayers({ props, viewStates }): any[];
  filterViewState({ viewState, currentViewState });
}

// Doesn't inherit from VivViewProps because that's the currently documented situation.
interface OverviewViewProps {
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
}

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
  constructor(props: OverviewViewProps);
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

interface SideBySideViewProps extends VivViewProps {
  linkedIds?: any[];
  panLock?: boolean;
  zoomLock?: boolean;
  viewportOutlineColor?: number[];
  viewportOutlineWidth?: number;
}

export class SideBySideView extends VivView {
  constructor(props: SideBySideViewProps);
}

interface VivViewerProps {
  layerProps: any;
  randomize?: any;
  views: any[];
  onViewStateChange?: any;
  hoverHooks?: { handleValue?: any };
}

export class VivViewer extends PureComponent<VivViewerProps> {
  constructor(props: VivViewerProps);
  layerFilter({ layer, viewport }): boolean;
  _onViewStateChange({ viewId, viewState, interactionState, oldViewState });
  static getDerivedStateFromProps(props, prevState);
  onHover({ sourceLayer, coordinate, layer });
  _renderLayers();
  render(): JSX.Element;
}

interface CommonViewerProps {
  sliderValues: number[][];
  colorValues: number[][];
  channelIsOn: boolean[];
  colormap: string;
  loader: any;
  loaderSelection: any[];
  initialViewState: any;
  height: number;
  width: number;
  isLensOn: boolean;
  lensSelection: number;
  lensRadius: number;
  lensBorderColor: number[];
  lensBorderRadius: number;
  lensBorderRadius: number;
  onViewStateChange?: any;
}

interface PictureInPictureViewerProps extends CommonViewerProps {
  overview: any;
  overviewOn: boolean;
  hoverHooks?: { handleValue?: any };
  clickCenter: boolean;
}

export const PictureInPictureViewer: (
  props: PictureInPictureViewerProps
) => JSX.Element;

interface SideBySideViewerProps extends CommonViewerProps {
  zoomLock: boolean;
  panLock: boolean;
}

export const SideBySideViewer: (props: SideBySideViewerProps) => JSX.Element;

export class HTTPStore {
  constructor(url: any, options?: {});
  getItem(key: any, options?: {}): Promise<ArrayBuffer>;
}

export class OMETiffLoader {
  constructor({ tiff, pool, firstImage, omexmlString, offsets });
  _getIFDIndex(args: { z: number; time: number; channel: string }): number;
  onTileError(err: Error): void;
  getTile(args: {
    x: number;
    y: number;
    z: number;
    loaderSelection: any[];
    signal: any;
  }): Promise<any>;
  getRaster(args: { z: number; loaderSelection: any[] }): Promise<any>;
  getRasterSize({ z }: { z: number }): { width: number; height: number };
  getMetadata();
  _getChannel(args: {
    image: any;
    x: number;
    y: number;
    z: number;
    signal: any;
  }): Promise<any>;
  _tileInBounds(args: { x: number; y: number; z: number }): boolean;
  _parseIFD(index: number): void;
  _getTileExtent(args: {
    x: number;
    y: number;
    z: number;
  }): { width: number; height: number };
}

export class ZarrLoader {
  constructor(props: {
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
  getTile(args: {
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

export function createOMETiffLoader(props: {
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

export function getChannelStats(args: {
  loader: any;
  loaderSelection: any[];
}): any[];

export function getDefaultInitialViewState(loader, viewSize);
