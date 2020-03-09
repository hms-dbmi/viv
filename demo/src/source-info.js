const rootTIFFUrl =
  'https://vitessce-data.storage.googleapis.com/vanderbilt.images/';

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

export default {
  zarr: zarrInfo,
  tiff: tiffInfo,
  static: staticInfo
};
