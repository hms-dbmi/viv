const baseUrl = 'https://viv-demo.storage.googleapis.com';

const sources = [
  {
    // Generated using bioformats2raw and raw2ometiff.
    path: 'Vanderbilt-Spraggins-Kidney-MxIF.ome.tif',
    description: 'OME-TIFF Kidney mxIF'
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
