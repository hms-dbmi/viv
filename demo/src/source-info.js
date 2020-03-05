const rootTIFFUrl =
  'https://vitessce-data.storage.googleapis.com/vanderbilt.images/';

const tiffInfo = {
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
  'https://vitessce-demo-data.storage.googleapis.com/test-data/codex/codex_z001_r001_x003_y004.zarr';

const staticInfo = {
  initialViewState: {
    zoom: -1,
    target: [-500, -500]
  },
  minZoom: 0,
  channelNames: ['Actin', 'CD107a', 'CD11c', 'CD20', 'CD21', 'CD31'],
  url: rootStaticZarrUrl
};

export default {
  zarr: zarrInfo,
  tiff: tiffInfo,
  static: staticInfo
};
