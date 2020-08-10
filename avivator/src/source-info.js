const baseUrl = 'https://viv-demo.storage.googleapis.com';

const sources = [
  {
    // Generated using bioformats2raw and raw2ometiff.
    path: 'Vanderbilt-Spraggins-Kidney-MxIF.ome.tif',
    description: 'OME-TIFF Kidney mxIF'
  },
  {
    // Non-pyramidal OME-TIFF
    path: 'antigen_exprs.ome.tiff',
    description: 'CODEX Tile'
  },
  {
    // Old Faas(?) bioformats pyramid
    path: 'TONSIL-1_40X.ome.tif',
    description: 'Legacy Bioformats OME-TIFF pyramid (Fass)'
  },
  {
    // Generated using bioformats2raw and raw2ometiff.
    path: 'VAN0008-RK-403-100-PAS_registered.ome.tif',
    description: 'OME-TIFF PAS Donor Image'
  },
  {
    // Generated using bioformats2raw and raw2ometiff
    path: 'VAN0003-LK-32-21-AF_preIMS_registered.ome.tif',
    description: 'OME-TIFF AF Donor Image'
  },
  {
    path: '12448_G1HR_Mesh003.ome.tif',
    description: 'OME-TIFF Covid-19 Primary Gut Epithelial Stem Cells'
  },
  {
    // Generated with `bioformats2raw --file_type=zarr --dimension_order='XYZCT'`
    path: 'LuCa-7color_Scan1/',
    description: 'Perkin Elmer LuCa-7color_Scan1.qptiff'
  }
];

export default sources.map(s => ({
  url: `${baseUrl}/${s.path}`,
  description: s.description
}));
