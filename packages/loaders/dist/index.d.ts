import { GeoTIFFImage, GeoTIFF } from 'geotiff';
import { PixelSource, SupportedDtype, Labels, PixelSourceMeta, PixelSourceSelection, RasterSelection, PixelData, TileSelection } from '@vivjs/types';
import * as zarr from 'zarrita';

/**
 * Structural type compatible with `GeoTIFFImage.readRasters({ pool })`.
 *
 * @see https://github.com/geotiffjs/geotiff.js/blob/master/src/pool.js
 */
type DecodePool = {
    decode: (fileDirectory: unknown, buffer: ArrayBuffer) => Promise<ArrayBuffer>;
    destroy?: () => void | Promise<void>;
};
/**
 * Decoder pool for geotiff.js: same surface as geotiff's default Pool (`decode` /
 * `destroy`) but always sends work to decoder workers when `size > 0`.
 */
declare class Pool implements DecodePool {
    private workerWrappers;
    constructor(size?: number, createWorker?: () => Worker);
    decode(fileDirectory: unknown, buffer: ArrayBuffer): Promise<ArrayBuffer>;
    destroy(): Promise<void>;
}

type OmeXml = {
    images?: any[];
    rois?: any[];
    roiRefs?: any[];
};

declare class TiffPixelSource<S extends string[]> implements PixelSource<S> {
    dtype: SupportedDtype;
    tileSize: number;
    shape: number[];
    labels: Labels<S>;
    meta?: PixelSourceMeta | undefined;
    pool?: (DecodePool | false) | undefined;
    private _indexer;
    constructor(indexer: (sel: PixelSourceSelection<S>) => Promise<GeoTIFFImage>, dtype: SupportedDtype, tileSize: number, shape: number[], labels: Labels<S>, meta?: PixelSourceMeta | undefined, pool?: (DecodePool | false) | undefined);
    getRaster({ selection, signal }: RasterSelection<S>): Promise<PixelData>;
    getTile({ x, y, selection, signal }: TileSelection<S>): Promise<PixelData>;
    private _readRasters;
    private _getTileExtent;
    onTileError(err: Error): void;
}

type OmeTiffDims = ['t', 'c', 'z'] | ['z', 't', 'c'] | ['t', 'z', 'c'] | ['c', 'z', 't'] | ['z', 'c', 't'] | ['c', 't', 'z'];
interface OmeTiffSelection {
    t: number;
    c: number;
    z: number;
}
/** TIFF PhotometricInterpretation: RGB */
declare const PHOTOMETRIC_RGB = 2;
/** TIFF PhotometricInterpretation: YCbCr (common for JPEG H&E) */
declare const PHOTOMETRIC_YCBCR = 6;

interface TiffOptions {
    headers?: Headers | Record<string, string>;
    offsets?: number[];
    pool?: DecodePool | false;
    /**
     * A pre-constructed GeoTIFF instance. When provided, the loader skips
     * its internal HTTP client and uses this GeoTIFF for all data access.
     * This enables custom transport layers (e.g., AWS SigV4 request signing)
     * via geotiff's `fromCustomClient()`.
     *
     * Only applies to single-file OME-TIFFs. Ignored for companion
     * (multifile) OME-TIFFs which open multiple GeoTIFFs internally.
     */
    source?: GeoTIFF;
}
interface MultiTiffOptions {
    pool?: DecodePool | false;
    name?: string;
    channelNames?: string[];
    headers?: Headers | Record<string, string>;
}
type OmeTiffImage = {
    data: TiffPixelSource<OmeTiffDims>[];
    metadata: OmeXml[number];
};
/** @ignore */
declare function loadOmeTiff(source: string | File, opts: TiffOptions & {
    images: 'all';
}): Promise<OmeTiffImage[]>;
/** @ignore */
declare function loadOmeTiff(source: string | File, opts: TiffOptions & {
    images: 'first';
}): Promise<OmeTiffImage>;
/** @ignore */
declare function loadOmeTiff(source: string | File, opts: TiffOptions): Promise<OmeTiffImage>;
/** @ignore */
declare function loadOmeTiff(source: string | File): Promise<OmeTiffImage>;
/**
 * Opens multiple tiffs as a multidimensional "stack" of 2D planes.
 * Also supports loading multiple slickes of a stack from a stacked tiff.
 * Returns the data source and OME-TIFF-like metadata.
 *
 * @example
 * const { data, metadata } = await loadMultiTiff([
 *  [{ c: 0, t: 0, z: 0 }, 'https://example.com/channel_0.tif'],
 *  [{ c: 1, t: 0, z: 0 }, 'https://example.com/channel_1.tif'],
 *  [{ c: 2, t: 0, z: 0 }, undefined, { c: 3, t: 0, z: 0 }], 'https://example.com/channels_2-3.tif'],
 * ]);
 *
 * await data.getRaster({ selection: { c: 0, t: 0, z: 0 } });
 * // { data: Uint16Array[...], width: 500, height: 500 }
 *
 * @param {Array<[OmeTiffSelection | (OmeTiffSelection | undefined)[], (string | File)]>} sources
 * Pairs of `[Selection | (OmeTiffSelection | undefined)[], string | File]` entries indicating the multidimensional selection in the virtual stack in image source (url string, or `File`).
 * If the url is prefixed with file:// will attempt to load with GeoTIFF's 'fromFile', which requires access to Node's fs module.
 * You should only provide (OmeTiffSelection | undefined)[] when loading from stacked tiffs. In this case the array index corresponds to the image index in the stack, and the selection is the
 * selection that image corresponds to. Undefined selections are for images that should not be loaded.
 * @param {Object} opts
 * @param {import('./lib/Pool').DecodePool | false} [opts.pool] - Decode worker pool (see {@link Pool} from `@vivjs/loaders`) or `false` for main-thread decode.
 * @param {string} [opts.name='MultiTiff'] - a name for the "virtual" image stack.
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
declare function loadMultiTiff(sources: [
    OmeTiffSelection | (OmeTiffSelection | undefined)[],
    string | (File & {
        path: string;
    })
][], opts?: MultiTiffOptions): Promise<{
    data: TiffPixelSource<string[]>[];
    metadata: {
        ID: string;
        Name: string;
        AcquisitionDate: string;
        Description: string;
        Pixels: {
            BigEndian: boolean;
            DimensionOrder: "XYZCT" | "XYZTC" | "XYCTZ" | "XYCZT" | "XYTCZ" | "XYTZC";
            ID: string;
            SizeC: number;
            SizeT: number;
            SizeX: number;
            SizeY: number;
            SizeZ: number;
            Type: string;
            Channels: {
                ID: string;
                Name: string;
                SamplesPerPixel: number;
            }[];
        };
        format: () => {
            'Acquisition Date': string;
            'Dimensions (XY)': string;
            PixelsType: string;
            'Z-sections/Timepoints': string;
            Channels: number;
        };
    };
}>;

/**
 * For convenience - similar-ish interface to ZarrArray from non-zarrita zarr implementation.
 */
type ZarrArray = zarr.Array<zarr.DataType>;
type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

interface ZarrTileSelection {
    x: number;
    y: number;
    selection: number[];
    signal?: AbortSignal;
}
interface ZarrRasterSelection {
    selection: number[];
    signal?: AbortSignal;
}
declare class ZarrPixelSource<S extends string[]> implements PixelSource<S> {
    labels: Labels<S>;
    tileSize: number;
    private _data;
    private _indexer;
    constructor(data: ZarrArray, labels: Labels<S>, tileSize: number);
    get shape(): number[];
    get dtype(): SupportedDtype;
    private get _xIndex();
    private _chunkIndex;
    /**
     * Converts x, y tile indices to zarr dimension Slices within image bounds.
     */
    private _getSlices;
    private _getRaw;
    getRaster({ selection, signal }: RasterSelection<S> | ZarrRasterSelection): Promise<PixelData>;
    getTile(props: TileSelection<S> | ZarrTileSelection): Promise<PixelData>;
    onTileError(err: Error): void;
}

interface Channel {
    channelsVisible: boolean;
    color: string;
    label: string;
    window: {
        min?: number;
        max?: number;
        start: number;
        end: number;
    };
}
interface Omero {
    channels: Channel[];
    rdefs: {
        defaultT?: number;
        defaultZ?: number;
        model: string;
    };
    name?: string;
}
interface Axis {
    name: string;
    type?: string;
    unit?: string;
}
interface Multiscale {
    datasets: {
        path: string;
    }[];
    axes?: string[] | Axis[];
    version?: string;
}
interface RootAttrs {
    omero: Omero;
    multiscales: Multiscale[];
}
declare function load(store: ZarrArray['store']): Promise<{
    data: ZarrPixelSource<string[]>[];
    metadata: RootAttrs;
}>;

interface ZarrOptions {
    fetchOptions: RequestInit;
}
/**
 * Opens root of multiscale OME-Zarr via URL.
 *
 * @param source url
 * @param options
 * @return data source and associated OME-Zarr metadata.
 */
declare function loadOmeZarr(source: string, options?: Partial<ZarrOptions & {
    type: 'multiscales';
}>): Promise<{
    data: ZarrPixelSource<string[]>[];
    metadata: RootAttrs;
}>;
/**
 * DEPRECATED: This function is designed to load Zarr data generated by an old version of bioformats2raw
 * (circa 2022 and pre-v0.5.0). You are probably looking for the loadOmeZarr function instead,
 * which is designed to load modern OME-Zarr data following the OME-NGFF specifications,
 * which is also the current (as of 2026) bioformats2raw output format.
 *
 * OLD DESCRIPTION: Opens root directory generated via
 * `bioformats2raw --file_type=zarr`.
 * Uses OME-XML metadata, and assumes first image.
 * This function is the zarr-equivalent to using loadOmeTiff.
 *
 * Supports both METADATA.ome.xml and OME/METADATA.ome.xml
 *
 * @param source url
 * @param options
 * @return data source and associated OMEXML metadata.
 */
declare function DEPRECATED_loadBioformatsZarr(source: string | (File & {
    path: string;
})[], options?: Partial<ZarrOptions>): Promise<{
    data: ZarrPixelSource<string[]>[];
    metadata: any;
}>;

/**
 * Computes statics from pixel data.
 *
 * This is helpful for generating histograms
 * or scaling contrastLimits to reasonable range. Also provided are
 * "contrastLimits" which are slider bounds that should give a
 * good initial image.
 * @param {TypedArray} arr
 * @return {{ mean: number, sd: number, q1: number, q3: number, median: number, domain: number[], contrastLimits: number[] }}
 */
declare function getChannelStats(arr: TypedArray): {
    mean: number;
    sd: number;
    q1: number;
    q3: number;
    median: number;
    domain: number[];
    contrastLimits: number[];
};
declare function isInterleaved(shape: number[]): boolean;
declare function getImageSize<T extends string[]>(source: PixelSource<T>): {
    height: number;
    width: number;
};
declare const SIGNAL_ABORTED = "__vivSignalAborted";

/**
 * True when interleaved visual samples are not yet RGB and must be converted
 * before consumers that assume R,G,B (BitmapLayer with meta=RGB, analysis, etc.).
 * Extend here for CMYK / CIELab if those packed paths land.
 */
declare function needsPhotometricRgbConversion(photometricInterpretation?: number): boolean;
/**
 * Convert interleaved photometric samples to RGB. Matches geotiff.js
 * `fromYCbCr` and Viv BitmapLayer (Cb/Cr centered at 128 on 0–255).
 */
declare function convertInterleavedPhotometricToRgb(data: ArrayLike<number>, photometricInterpretation?: number): Uint8Array;

export { DEPRECATED_loadBioformatsZarr, PHOTOMETRIC_RGB, PHOTOMETRIC_YCBCR, Pool, SIGNAL_ABORTED, TiffPixelSource, ZarrPixelSource, convertInterleavedPhotometricToRgb, getChannelStats, getImageSize, isInterleaved, loadMultiTiff, loadOmeTiff, loadOmeZarr, load as loadOmeZarrFromStore, needsPhotometricRgbConversion };
export type { DecodePool, RootAttrs };
