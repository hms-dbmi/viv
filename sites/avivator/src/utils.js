import { Matrix4 } from '@math.gl/core';
import { fromBlob, fromUrl } from 'geotiff';
import { useEffect, useState } from 'react';

import {
  AdditiveColormap3DExtensions,
  ColorPalette3DExtensions,
  RENDERING_MODES,
  getChannelStats,
  loadBioformatsZarr,
  loadMultiTiff,
  loadOmeTiff,
  loadOmeZarr
} from '@hms-dbmi/viv';

import { GLOBAL_SLIDER_DIMENSION_FIELDS } from './constants';

const MAX_CHANNELS_FOR_SNACKBAR_WARNING = 40;

/**
 * Guesses whether string URL or File is for an OME-TIFF image.
 * @param {string | File} urlOrFile
 */
function isOmeTiff(urlOrFile) {
  if (Array.isArray(urlOrFile)) return false; // local Zarr is array of File Objects
  const name = typeof urlOrFile === 'string' ? urlOrFile : urlOrFile.name;
  return (
    name.includes('ome.tiff') ||
    name.includes('ome.tif') ||
    name.includes('.companion.ome')
  );
}

/**
 * Gets an array of filenames for a multi tiff input.
 * @param {string | File | File[]} urlOrFiles
 */
function getMultiTiffFilenames(urlOrFiles) {
  if (Array.isArray(urlOrFiles)) {
    return urlOrFiles.map(f => f.name);
  }
  if (urlOrFiles instanceof File) {
    return [urlOrFiles.name];
  }
  return urlOrFiles.split(',');
}

/**
 * Guesses whether string URL or File is one or multiple standard TIFF images.
 * @param {string | File | File[]} urlOrFiles
 */
function isMultiTiff(urlOrFiles) {
  const filenames = getMultiTiffFilenames(urlOrFiles);
  for (const filename of filenames) {
    const lowerCaseName = filename.toLowerCase();
    if (!(lowerCaseName.includes('.tiff') || lowerCaseName.includes('.tif')))
      return false;
  }
  return true;
}

/**
 * Turns an input string of one or many urls, file, or file array into a uniform array.
 * @param {string | File | File[]} urlOrFiles
 */
async function generateMultiTiffFileArray(urlOrFiles) {
  if (Array.isArray(urlOrFiles)) {
    return urlOrFiles;
  }
  if (urlOrFiles instanceof File) {
    return [urlOrFiles];
  }
  return urlOrFiles.split(',');
}

/**
 * Gets the basic image count for a TIFF using geotiff's getImageCount.
 * @param {string | File} src
 */
async function getTiffImageCount(src) {
  const from = typeof src === 'string' ? fromUrl : fromBlob;
  const tiff = await from(src);
  return tiff.getImageCount();
}

/**
 * Guesses whether string URL or File is one or multiple standard TIFF images.
 * @param {string | File | File[]} urlOrFiles
 */
async function generateMultiTiffSources(urlOrFiles) {
  const multiTiffFiles = await generateMultiTiffFileArray(urlOrFiles);
  const sources = [];
  let c = 0;
  for (const tiffFile of multiTiffFiles) {
    const selections = [];
    const numImages = await getTiffImageCount(tiffFile);
    for (let i = 0; i < numImages; i++) {
      selections.push({ c, z: 0, t: 0 });
      c += 1;
    }
    sources.push([selections, tiffFile]);
  }
  return sources;
}

class UnsupportedBrowserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedBrowserError';
  }
}

async function getTotalImageCount(sources) {
  const firstOmeTiffImage = sources[0];
  const firstPixelSource = firstOmeTiffImage.data[0];
  const representativeGeoTiffImage = await firstPixelSource._indexer({
    c: 0,
    z: 0,
    t: 0
  });
  const hasSubIFDs = Boolean(
    representativeGeoTiffImage?.fileDirectory?.SubIFDs
  );

  // Non-Bioformats6 pyramids use Image tags for pyramid levels and do not have offsets
  // built in to the format for them, hence the ternary.

  if (hasSubIFDs) {
    return sources.reduce((sum, { metadata }) => {
      const { SizeC, SizeT, SizeZ } = metadata.Pixels;
      const numImagesPerResolution = SizeC * SizeT * SizeZ;
      return numImagesPerResolution + sum;
    }, 1);
  }

  const levels = firstOmeTiffImage.data.length;
  const { SizeC, SizeT, SizeZ } = firstOmeTiffImage.metadata.Pixels;
  const numImagesPerResolution = SizeC * SizeT * SizeZ;
  return numImagesPerResolution * levels;
}

/**
 * @param {unknown} e
 * @returns {e is Error & { issues: unknown }}
 */
function isZodError(e) {
  return e instanceof Error && 'issues' in e;
}

/** @param {string} url */
async function fetchSingleFileOmeTiffOffsets(url) {
  // No offsets for multifile OME-TIFFs
  if (url.includes('companion.ome')) {
    return undefined;
  }
  const offsetsUrl = url.replace(/ome\.tif(f?)/gi, 'offsets.json');
  const res = await fetch(offsetsUrl);
  return res.status === 200 ? await res.json() : undefined;
}

/**
 * Given an image source, creates a PixelSource[] and returns XML-meta
 *
 * @param {string | File | File[]} urlOrFile
 * @param {} handleOffsetsNotFound
 * @param {*} handleLoaderError
 */
export async function createLoader(
  urlOrFile,
  handleOffsetsNotFound,
  handleLoaderError
) {
  // If the loader fails to load, handle the error (show an error snackbar).
  // Otherwise load.
  try {
    // OME-TIFF
    if (isOmeTiff(urlOrFile)) {
      if (urlOrFile instanceof File) {
        // TODO(2021-05-09): temporarily disable `pool` until inline worker module is fixed.
        const source = await loadOmeTiff(urlOrFile, {
          images: 'all',
          pool: false
        });
        return source;
      }

      const maybeOffsets = await fetchSingleFileOmeTiffOffsets(urlOrFile);

      // TODO(2021-05-06): temporarily disable `pool` until inline worker module is fixed.
      const source = await loadOmeTiff(urlOrFile, {
        offsets: maybeOffsets,
        images: 'all',
        pool: false
      });

      // Show a warning if the total number of channels/images exceeds a fixed amount.
      const totalImageCount = await getTotalImageCount(source);
      if (
        !maybeOffsets &&
        totalImageCount > MAX_CHANNELS_FOR_SNACKBAR_WARNING
      ) {
        handleOffsetsNotFound(true);
      }
      return source;
    }

    if (
      Array.isArray(urlOrFile) &&
      typeof urlOrFile[0].arrayBuffer !== 'function'
    ) {
      throw new UnsupportedBrowserError(
        'Cannot upload a local Zarr or flat TIFF files with this browser. Try using Chrome, Firefox, or Microsoft Edge.'
      );
    }

    // Multiple flat tiffs
    if (isMultiTiff(urlOrFile)) {
      const mutiTiffSources = await generateMultiTiffSources(urlOrFile);
      const source = await loadMultiTiff(mutiTiffSources, {
        images: 'all',
        pool: false
      });
      return source;
    }

    // Bio-Formats Zarr
    let source;
    try {
      source = await loadBioformatsZarr(urlOrFile);
    } catch (e) {
      if (isZodError(e)) {
        // If the error is a ZodError, it means there was an OME-XML file
        // but it was invalid. We shouldn't try to load the file as a OME-Zarr.
        throw e;
      }

      // try ome-zarr
      const res = await loadOmeZarr(urlOrFile, { type: 'multiscales' });
      const channels = res.metadata?.omero?.channels ?? [{ label: 'image' }];
      // extract metadata into OME-XML-like form
      const metadata = {
        Pixels: {
          Channels: channels.map(c => ({ Name: c.label, SamplesPerPixel: 1 }))
        }
      };
      source = { data: res.data, metadata };
    }
    return source;
  } catch (e) {
    if (e instanceof UnsupportedBrowserError) {
      handleLoaderError(e.message);
    } else {
      console.error(e);
      handleLoaderError(null);
    }
    return { data: null };
  }
}

// Get the last part of a url (minus query parameters) to be used
// as a display name for avivator.
export function getNameFromUrl(url) {
  return url.split('?')[0].split('/').slice(-1)[0];
}

/**
 * Return the midpoint of the global dimensions as a default selection.
 *
 * @param {{ name: string, size: number }[]} dimensions
 * @returns {{ [Key in typeof GLOBAL_SLIDER_DIMENSION_FIELDS[number]]?: number }
 */
function getDefaultGlobalSelection(dimensions) {
  const globalSelectableDimensions = dimensions.filter(d =>
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(d.name.toLowerCase())
  );

  /** @type {{ [Key in typeof GLOBAL_SLIDER_DIMENSION_FIELDS[number]]?: number } */
  const selection = {};
  for (const dim of globalSelectableDimensions) {
    selection[dim.name] = Math.floor(dim.size / 2);
  }

  return selection;
}

function isGlobalOrXYDimension(name) {
  // normalize name to lowercase
  // biome-ignore lint/style/noParameterAssign: Simple normalization, this is fine.
  name = name.toLowerCase();
  return (
    name === 'x' ||
    name === 'y' ||
    GLOBAL_SLIDER_DIMENSION_FIELDS.includes(name)
  );
}

/**
 * @param {Array.<number>} shape loader shape
 */
export function isInterleaved(shape) {
  const lastDimSize = shape[shape.length - 1];
  return lastDimSize === 3 || lastDimSize === 4;
}

/**
 * @template A
 * @template B
 * @param {Array<A>} a
 * @param {Array<B>} b
 * @returns {Array<[A, B]>}
 */
function zip(a, b) {
  if (a.length !== b.length) {
    throw new Error('Array lengths must be equal');
  }
  return a.map((val, i) => [val, b[i]]);
}

// Create a default selection using the midpoint of the available global dimensions,
// and then the first four available selections from the first selectable channel.
/**
 *
 * @param {{ labels: string[], shape: number[] }} pixelSource
 */
export function buildDefaultSelection({ labels, shape }) {
  const selection = [];

  const dimensions = zip(labels, shape).map(([name, size]) => ({ name, size }));

  const globalSelection = getDefaultGlobalSelection(dimensions);

  // First non-global dimension with some sort of selectable values.
  const firstNonGlobalSelectableDimension = dimensions.find(
    dim => !isGlobalOrXYDimension(dim.name)
  );

  // If there are no additional selectable dimensions, return the global selection.
  if (!firstNonGlobalSelectableDimension) {
    return [globalSelection];
  }

  for (
    let i = 0;
    i < Math.min(4, firstNonGlobalSelectableDimension.size);
    i += 1
  ) {
    selection.push({
      [firstNonGlobalSelectableDimension.name]: i,
      ...globalSelection
    });
  }

  if (isInterleaved(shape)) {
    return [{ ...selection[0], c: 0 }];
  }

  return selection;
}

export function hexToRgb(hex) {
  // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result.map(d => Number.parseInt(d, 16)).slice(1);
}

export function range(length) {
  return [...Array(length).keys()];
}

export function useWindowSize(scaleWidth = 1, scaleHeight = 1) {
  function getSize() {
    return {
      width: window.innerWidth * scaleWidth,
      height: window.innerHeight * scaleHeight
    };
  }
  const [windowSize, setWindowSize] = useState(getSize());
  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getSize());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
  return windowSize;
}

export async function getSingleSelectionStats2D({ loader, selection }) {
  const data = Array.isArray(loader) ? loader[loader.length - 1] : loader;
  const raster = await data.getRaster({ selection });
  const selectionStats = getChannelStats(raster.data);
  const { domain, contrastLimits } = selectionStats;
  // Edge case: if the contrast limits are the same, set them to the domain.
  if (contrastLimits[0] === contrastLimits[1]) {
    contrastLimits[0] = domain[0];
    contrastLimits[1] = domain[1];
  }
  return { domain, contrastLimits };
}

export async function getSingleSelectionStats3D({ loader, selection }) {
  const lowResSource = loader[loader.length - 1];
  const { shape, labels } = lowResSource;
  const sizeZ = shape[labels.indexOf('z')];
  const raster0 = await lowResSource.getRaster({
    selection: { ...selection, z: 0 }
  });
  const rasterMid = await lowResSource.getRaster({
    selection: { ...selection, z: Math.floor(sizeZ / 2) }
  });
  const rasterTop = await lowResSource.getRaster({
    selection: { ...selection, z: Math.max(0, sizeZ - 1) }
  });
  const stats0 = getChannelStats(raster0.data);
  const statsMid = getChannelStats(rasterMid.data);
  const statsTop = getChannelStats(rasterTop.data);
  return {
    domain: [
      Math.min(stats0.domain[0], statsMid.domain[0], statsTop.domain[0]),
      Math.max(stats0.domain[1], statsMid.domain[1], statsTop.domain[1])
    ],
    contrastLimits: [
      Math.min(
        stats0.contrastLimits[0],
        statsMid.contrastLimits[0],
        statsTop.contrastLimits[0]
      ),
      Math.max(
        stats0.contrastLimits[1],
        statsMid.contrastLimits[1],
        statsTop.contrastLimits[1]
      )
    ]
  };
}

export const getSingleSelectionStats = async ({ loader, selection, use3d }) => {
  const getStats = use3d
    ? getSingleSelectionStats3D
    : getSingleSelectionStats2D;
  return getStats({ loader, selection });
};

export const getMultiSelectionStats = async ({ loader, selections, use3d }) => {
  const stats = await Promise.all(
    selections.map(selection =>
      getSingleSelectionStats({ loader, selection, use3d })
    )
  );
  const domains = stats.map(stat => stat.domain);
  const contrastLimits = stats.map(stat => stat.contrastLimits);
  return { domains, contrastLimits };
};

// https://stackoverflow.com/a/11381730
export function isMobileOrTablet() {
  let check = false;
  (a => {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

/**
 * @param { import('../../src/loaders/omexml').OMEXML[0] } imgMeta
 */
export function guessRgb({ Pixels }) {
  const numChannels = Pixels.Channels.length;
  const { SamplesPerPixel } = Pixels.Channels[0];

  const is3Channel8Bit = numChannels === 3 && Pixels.Type === 'uint8';
  const interleavedRgb =
    Pixels.SizeC === 3 && numChannels === 1 && Pixels.Interleaved;

  return SamplesPerPixel === 3 || is3Channel8Bit || interleavedRgb;
}
export function truncateDecimalNumber(value, maxLength) {
  if (!value && value !== 0) return '';
  const stringValue = value.toString();
  return stringValue.length > maxLength
    ? stringValue.substring(0, maxLength).replace(/\.$/, '')
    : stringValue;
}

/**
 * Get physical size scaling Matrix4
 * @param {Object} loader PixelSource
 */
export function getPhysicalSizeScalingMatrix(loader) {
  const { x, y, z } = loader?.meta?.physicalSizes ?? {};
  if (x?.size && y?.size && z?.size) {
    const min = Math.min(z.size, x.size, y.size);
    const ratio = [x.size / min, y.size / min, z.size / min];
    return new Matrix4().scale(ratio);
  }
  return new Matrix4().identity();
}

export function getBoundingCube(loader) {
  const source = Array.isArray(loader) ? loader[0] : loader;
  const { shape, labels } = source;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const xSlice = [0, physicalSizeScalingMatrix[0] * shape[labels.indexOf('x')]];
  const ySlice = [0, physicalSizeScalingMatrix[5] * shape[labels.indexOf('y')]];
  const zSlice = [
    0,
    physicalSizeScalingMatrix[10] * shape[labels.indexOf('z')]
  ];
  return [xSlice, ySlice, zSlice];
}

/**
 * Return an appropriate 3D extension for a given combination of `colormap` and `renderingMode`
 * @param {String} colormap
 * @param {String} renderingMode
 */
export function get3DExtension(colormap, renderingMode) {
  const extensions = colormap
    ? AdditiveColormap3DExtensions
    : ColorPalette3DExtensions;
  if (renderingMode === RENDERING_MODES.MAX_INTENSITY_PROJECTION) {
    return new extensions.MaximumIntensityProjectionExtension();
  }
  if (renderingMode === RENDERING_MODES.MIN_INTENSITY_PROJECTION) {
    return new extensions.MinimumIntensityProjectionExtension();
  }
  if (renderingMode === RENDERING_MODES.ADDITIVE) {
    return new extensions.AdditiveBlendExtension();
  }
  throw new Error(`${renderingMode} rendering mode not supported`);
}
