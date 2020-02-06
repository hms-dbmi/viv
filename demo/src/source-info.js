const rootTIFFUrl =
  'https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/VAN0001-RK-1-21_24-MxIF-mxIF_toIMS/';
// const rootZarrUrl = 'https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/vanderbilt-data/single_channel_pyramid/img_pyramid/'
export const source = {
  height: 141,
  width: 206,
  tileSize: 256,
  // channels: {
  //   "Cy3 - Synaptopodin (glomerular)": `${rootZarrUrl}channel_0`,
  //   "Cy5 - THP (thick limb)": `${rootZarrUrl}channel_1`,
  //   "DAPI - Hoescht (nuclei)": `${rootZarrUrl}channel_2`,
  //   "FITC - Laminin (basement membrane)": `${rootZarrUrl}channel_3`,
  // },
  channels: {
    'Cy3 - Synaptopodin (glomerular)': `${rootTIFFUrl}vanderbilt_test_Cy3 - Synaptopodin (glomerular).ome.tiff`,
    'Cy5 - THP (thick limb)': `${rootTIFFUrl}vanderbilt_test_Cy5 - THP (thick limb).ome.tiff`,
    'DAPI - Hoescht (nuclei)': `${rootTIFFUrl}vanderbilt_test_DAPI - Hoescht (nuclei).ome.tiff`,
    'FITC - Laminin (basement membrane)': `${rootTIFFUrl}vanderbilt_test_FITC - Laminin (basement membrane).ome.tiff`
  }
};
