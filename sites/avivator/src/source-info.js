const baseUrl = 'https://viv-demo.storage.googleapis.com';

const sources = [
  {
    // Generated using bioformats2raw and raw2ometiff.
    // channels: 4, type: uint16
    path: 'Vanderbilt-Spraggins-Kidney-MxIF.ome.tif',
    description: 'OME-TIFF Kidney mxIF'
  },
  {
    // channels: 1, type: uint16
    path: '12448_G1HR_Mesh003.ome.tif',
    description: 'OME-TIFF Covid-19 Primary Gut Epithelial Stem Cells'
  },
  {
    // Generated with `bioformats2raw --file_type=zarr --dimension_order='XYZCT'`
    // channels: 5, type: uint8
    path: 'LuCa-7color_Scan1/',
    description: 'Perkin Elmer LuCa-7color_Scan1.qptiff'
  },
  {
    // Generated using bioformats2raw and raw2ometiff.
    // channels: 8, type: float
    path: 'LuCa-7color_3x3component_data.ome.tif',
    description: 'Perkin Elmer LuCa-7color_3x3component_data.qptiff'
  },
  {
    // Generated using bioformats2raw and raw2ometiff.
    // channels: 8, type: uint16, SizeZ: 259
    path: '2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif',
    description: 'idr0077'
  },
  {
    // Generated using bioformats2raw and raw2ometiff.
    // channels: 2, type: uint16, SizeZ: 1955
    path: 'brain.pyramid.ome.tif',
    description: 'idr0085'
  },
  {
    // Generated using bioformats2raw and raw2ometiff.
    // channels: 3, type: uint16, SizeZ: 401
    path: 'idr0106.pyramid.ome.tif',
    description: 'idr0106'
  }
];

export default sources.map(s => ({
  urlOrFile: `${baseUrl}/${s.path}`,
  description: s.description
}));
