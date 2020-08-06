// Generated using bioformats2raw and raw2ometiff.
const tiffInfo = {
  url: `https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/spraggins.ome.tif`,
  isPublic: true,
  description: 'Kidney mxIF (OME-TIFF)'
};

const rootStaticTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/antigen_exprs.ome.tiff';

const staticTiffInfo = {
  url: rootStaticTiffUrl,
  isPublic: false,
  description: 'CODEX Tile'
};

// Old Faas(?) bioformats pyramid
const remoteBFTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/TONSIL-1_40X.ome.tif';

const remoteBFTiff = {
  url: remoteBFTiffUrl,
  isPublic: false,
  description: 'Tonsil Legacy Bioformats Pyramid Tiff'
};

// Generated using bioformats2raw and raw2ometiff.
const remoteTiffRGBUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/test/VAN0008-RK-403-100-PAS_registered.ome.tif';

const remoteTiffRGB = {
  url: remoteTiffRGBUrl,
  isPublic: false,
  description: 'VAN0008-RK-403-100-PAS_registered PAS Donor Image'
};

const remoteTiffRGBUrl2 =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/VAN0011-RK-3-10-PAS_registered.ome.tif ';

const remoteTiffRGB2 = {
  url: remoteTiffRGBUrl2,
  isPublic: false,
  description: 'VAN0011-RK-3-10-PAS_registered PAS Donor Image'
};

// Generated using bioformats2raw and raw2ometiff.
const remoteTiffUrl2 =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/VAN0003-LK-32-21-AF_preIMS_registered.ome.tif';

const remoteTiff2 = {
  url: remoteTiffUrl2,
  isPublic: false,
  description: 'VAN0003-LK-32-21 AF Donor Image'
};

const covidTiffInfo = {
  url:
    'https://vitessce-demo-data.storage.googleapis.com/test-data/12448_G1HR_Mesh003.ome.tif',
  isPublic: true,
  description: 'Covid-19 Primary Gut Epithelial Stem Cells (OME-TIFF)'
};

export default {
  tiff: tiffInfo,
  'static tiff': staticTiffInfo,
  'bf tiff': remoteBFTiff,
  'tiff 2': remoteTiff2,
  'covid tiff': covidTiffInfo,
  'rgb tiff': remoteTiffRGB,
  'rgb tiff 2': remoteTiffRGB2
};
