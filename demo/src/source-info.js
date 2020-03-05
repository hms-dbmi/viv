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
  channelNames: [
    'Cy3 - Synaptopodin (glomerular)',
    'Cy5 - THP (thick limb)',
    'DAPI - Hoescht (nuclei)',
    'FITC - Laminin (basement membrane)'
  ],
  url: rootZarrUrl
};

export default {
  zarr: zarrInfo,
  tiff: tiffInfo
};
