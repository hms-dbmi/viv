type SupportedTypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array;

interface LayerData {
  data: SupportedTypedArray;
  width: number;
  height: number;
}

interface RasterSelection<S> {
  selection: S;
}

interface TileSelection<S> {
  x: number;
  y: number;
  selection: S;
  signal?: S;
}

interface PhysicalSize {
  size: number;
  unit: string;
}

interface PixelSourceMeta {
  physicalSizes?: { [key: string]: PhysicalSize; };
  photometricInterpretation?: number;
}

interface PixelSource<S> {
  getRaster(sel: RasterSelection<S>): Promise<LayerData>;
  getTile(sel: TileSelection<S>): Promise<LayerData>;
  shape: number[];
  labels: string[];
  tileSize: number;
  meta?: PixelSourceMeta;
}