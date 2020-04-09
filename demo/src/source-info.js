const rootTIFFUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/vanderbilt.images/vanderbilt.images/';

const tiffInfo = {
  isPublic: true,
  channelNames: [
    'Cy3 - Synaptopodin (glomerular)',
    'Cy5 - THP (thick limb)',
    'DAPI - Hoescht (nuclei)',
    'FITC - Laminin (basement membrane)'
  ],
  url: rootTIFFUrl
};

const rootZarrUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/vanderbilt-data/vanderbilt_mxif_ims.zarr/mxif_pyramid';

const zarrInfo = {
  isPublic: true,
  isPyramid: true,
  channelNames: [
    'Cy3 - Synaptopodin (glomerular)',
    'Cy5 - THP (thick limb)',
    'DAPI - Hoescht (nuclei)',
    'FITC - Laminin (basement membrane)'
  ],
  url: rootZarrUrl
};

const rootStaticZarrUrl =
  'https://vitessce-data.storage.googleapis.com/0.0.24/master_release/spraggins/spraggins.ims.zarr';

const staticInfo = {
  isPublic: false,
  initialViewState: {
    zoom: -1,
    target: [1000, 500]
  },
  minZoom: 0,
  channelNames: ['703.5722'],
  url: rootStaticZarrUrl
};

const rootStaticTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/codex/antigen.ome.tiff';

const staticTiffInfo = {
  isPublic: false,
  initialViewState: {
    zoom: -1,
    target: [1000, 500]
  },
  channelNames: [
    'Cy3 - Synaptopodin (glomerular)',
    'Cy5 - THP (thick limb)',
    'DAPI - Hoescht (nuclei)',
    'FITC - Laminin (basement membrane)'
  ],
  url: rootStaticTiffUrl
};

const rootRGBTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/tumor_001.tif';

const rgbTiffInfo = {
  isPublic: false,
  initialViewState: {
    zoom: -6,
    target: [30000, 10000]
  },
  channelNames: [],
  url: rootRGBTiffUrl
};

export default {
  zarr: zarrInfo,
  tiff: tiffInfo,
  static: staticInfo,
  'static tiff': staticTiffInfo,
  rgb: rgbTiffInfo
};
