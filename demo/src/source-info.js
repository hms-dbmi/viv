import { range } from '../../src/layers/VivViewerLayer/utils';

const channelNames = [
  'DAPI - Hoechst (nuclei)',
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

// Generated using bioformats2raw and raw2ometiff.
const tiffInfo = {
  url: `https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/spraggins.ome.tif`,
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
  description: 'CODEX Tile'
};

// Old Faas(?) bioformats pyramid
const remoteBFTiffUrl =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/TONSIL-1_40X.ome.tif';

const remoteBFTiff = {
  url: remoteBFTiffUrl,
  initialViewState: {
    zoom: -3,
    target: [5000, 5000]
  },
  dimensions: [
    {
      field: 'channel',
      type: 'nominal',
      values: range(47).map(i => `Channel ${i}`)
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null },
    { field: 'time', type: 'number', values: null },
    { field: 'z', type: 'number', values: null }
  ],
  isPublic: false,
  isPyramid: true,
  selections: range(4)
    .map(i => `Channel ${i}`)
    .map(channel => {
      return { channel, time: 0, z: 0 };
    }),
  description: 'Tonsil Legacy Bioformats Pyramid Tiff'
};

// Generated using bioformats2raw and raw2ometiff.
const remoteTiffUrl2 =
  'https://vitessce-demo-data.storage.googleapis.com/test-data/hubmap/pyramid_0.0.2/VAN0003-LK-32-21-AF_preIMS_registered.ome.tif';

const remoteTiff2 = {
  url: remoteTiffUrl2,
  initialViewState: {
    zoom: -5,
    target: [30000, 30000]
  },
  dimensions: [
    {
      field: 'channel',
      type: 'nominal',
      values: [
        'DAPI - autofluorescence',
        'eGFP - autofluorescence',
        'dsRed - autofluorescence'
      ]
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null },
    { field: 'time', type: 'number', values: null },
    { field: 'z', type: 'number', values: null }
  ],
  isPublic: false,
  isPyramid: true,
  selections: [
    'DAPI - autofluorescence',
    'eGFP - autofluorescence',
    'dsRed - autofluorescence'
  ].map(channel => {
    return { channel, time: 0, z: 0 };
  }),
  description: 'VAN0003-LK-32-21 Donor Image'
};

const covidTiffInfo = {
  url:
    'https://vitessce-demo-data.storage.googleapis.com/test-data/12448_G1HR_Mesh003.ome.tif',
  dimensions: [
    {
      field: 'channel',
      type: 'nominal',
      values: [0]
    },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  selections: [{ channel: 0 }],
  isPublic: true,
  isPyramid: true,
  description: 'Covid-19 Primary Gut Epithelial Stem Cells (OME-TIFF)',
  initialViewState: {
    zoom: -7,
    target: [50000, 50000]
  }
};

const omeZarr = {
  url:
    'https://vitessce-demo-data.storage.googleapis.com/test-data/9822151.zarr',
  dimensions: [
    // TODO: Having the actual dimensions breaks the UI components currently
    // ome_zarr images are all (t, c, z, y, x)
    { field: 'c', type: 'nominal', values: [0] },
    { field: 'y', type: 'quantitative', values: null },
    { field: 'x', type: 'quantitative', values: null }
  ],
  selections: [{ c: 0 }],
  isPublic: true,
  isPyramid: true,
  description: 'IDR 9822151.zarr - SARS-CoV-2 in human instestinal cells',
  initialViewState: {
    zoom: -5,
    target: [30000, 20000]
  }
};

export default {
  zarr: zarrInfo,
  tiff: tiffInfo,
  static: staticInfo,
  'static tiff': staticTiffInfo,
  'bf tiff': remoteBFTiff,
  'tiff 2': remoteTiff2,
  'covid tiff': covidTiffInfo,
  'ome-zarr': omeZarr
};
