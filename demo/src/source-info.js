const channelNames = [
  'DAPI - Hoescht (nuclei)',
  'FITC - Laminin (basement membrane)',
  'Cy3 - Synaptopodin (glomerular)',
  'Cy5 - THP (thick limb)'
];

const basePyramidInfo = {
  dimensions: [
    { field: 'channel', type: 'nominal', values: channelNames },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  isPublic: true,
  isPyramid: true,
  selections: channelNames.map(name => ({ channel: name }))
};

const tiffInfo = {
  url: `https://vitessce-demo-data.storage.googleapis.com/test-data/vanderbilt.images/vanderbilt.images`,
  ...basePyramidInfo,
  description: 'Kidney mxIF (OME-TIFF)'
};

const zarrInfo = {
  url: `https://vitessce-data.storage.googleapis.com/0.0.25/master_release/spraggins/spraggins.mxif.zarr`,
  ...basePyramidInfo,
  description: 'Kidney mxIF (zarr)'
};

const staticInfo = {
  url: `https://vitessce-data.storage.googleapis.com/0.0.25/master_release/spraggins/spraggins.ims.zarr`,
  isPublic: false,
  initialViewState: {
    zoom: -1,
    target: [1000, 500]
  },
  dimensions: [
    {
      field: 'mz',
      type: 'ordinal',
      values: [
        '675.5366',
        '703.5722',
        '721.4766',
        '725.5562',
        '729.5892',
        '731.606',
        '734.5692',
        '737.4524',
        '739.4651',
        '741.5302',
        '745.4766',
        '747.4938',
        '749.5093',
        '753.5892',
        '756.5534',
        '758.5706',
        '772.5225',
        '772.5506',
        '776.5928',
        '780.5528',
        '782.5697',
        '784.5841',
        '786.6012',
        '787.6707',
        '790.5157',
        '796.5259',
        '798.54',
        '804.5528',
        '806.5683',
        '808.5838',
        '809.6518',
        '810.6',
        '811.6699',
        '813.6847',
        '815.699',
        '820.5262',
        '822.5394',
        '824.5559',
        '825.6241',
        '828.5495',
        '830.5666',
        '832.5816',
        '833.649',
        '835.6666',
        '837.6798',
        '848.5577',
        '851.6374'
      ]
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  selections: [{ mz: '703.5722' }, { mz: '721.4766' }],
  description: 'Kidney IMS (zarr)'
};

const rootStaticTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/antigen_exprs.ome.tiff';

const staticTiffInfo = {
  url: rootStaticTiffUrl,
  dimensions: [
    {
      field: 'channel',
      type: 'nominal',
      values: [
        'Actin',
        'CD107a',
        'CD11c',
        'CD20',
        'CD21',
        'CD31',
        'CD3e',
        'CD4',
        'CD45',
        'CD45RO',
        'CD68',
        'CD8',
        'DAPI_2',
        'E_CAD',
        'Histone_H3',
        'Ki67',
        'Pan_CK',
        'Podoplanin'
      ]
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null },
    { field: 'time', type: 'number', values: null },
    { field: 'z', type: 'number', values: null }
  ],
  initialViewState: {
    zoom: -1,
    target: [1000, 500]
  },
  isPublic: false,
  isPyramid: false,
  selections: ['DAPI_2', 'E_CAD', 'Histone_H3', 'Ki67'].map(channel => {
    return { channel, time: 0, z: 0 };
  }),
  description: 'static tiff'
};

export default {
  zarr: zarrInfo,
  tiff: tiffInfo,
  static: staticInfo,
  'static tiff': staticTiffInfo
};
