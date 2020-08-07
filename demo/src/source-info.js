// Generated using bioformats2raw and raw2ometiff.
const tiffInfo = {
  url: `https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/spraggins.ome.tif`,
  description: 'Kidney mxIF (OME-TIFF)'
};

const rootStaticTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/antigen_exprs.ome.tiff';

const staticTiffInfo = {
  url: rootStaticTiffUrl,
  description: 'CODEX Tile'
};

// Old Faas(?) bioformats pyramid
const remoteBFTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/TONSIL-1_40X.ome.tif';

const remoteBFTiff = {
  url: remoteBFTiffUrl,
  description: 'Tonsil Legacy Bioformats Pyramid Tiff'
};

// Generated using bioformats2raw and raw2ometiff.
const remoteTiffRGBUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/test/VAN0008-RK-403-100-PAS_registered.ome.tif';

const remoteTiffRGB = {
  url: remoteTiffRGBUrl,
  description: 'VAN0008-RK-403-100-PAS_registered PAS Donor Image'
};

// Generated using bioformats2raw and raw2ometiff.
const remoteTiffUrl2 =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/VAN0003-LK-32-21-AF_preIMS_registered.ome.tif';

const remoteTiff2 = {
  url: remoteTiffUrl2,
  description: 'VAN0003-LK-32-21 AF Donor Image'
};

const covidTiffInfo = {
  url:
    'https://vitessce-demo-data.storage.googleapis.com/test-data/12448_G1HR_Mesh003.ome.tif',
  description: 'Covid-19 Primary Gut Epithelial Stem Cells (OME-TIFF)'
};

export default [
  tiffInfo,
  staticTiffInfo,
  remoteBFTiff,
  remoteTiff2,
  covidTiffInfo,
  remoteTiffRGB
];
