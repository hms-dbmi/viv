const rootTIFFUrl =
  'https://vitessce-data.storage.googleapis.com/vanderbilt.images/';
// const rootZarrUrl = 'https://vitessce-vanderbilt-data.storage.googleapis.com/test-data/vanderbilt-data/single_channel_pyramid/img_pyramid/'
export const source = {
  height: 36040,
  width: 52260,
  tileSize: 256,
  // channels: {
  //   "Cy3 - Synaptopodin (glomerular)": `${rootZarrUrl}channel_0`,
  //   "Cy5 - THP (thick limb)": `${rootZarrUrl}channel_1`,
  //   "DAPI - Hoescht (nuclei)": `${rootZarrUrl}channel_2`,
  //   "FITC - Laminin (basement membrane)": `${rootZarrUrl}channel_3`,
  // },
  channels: {
    'Cy3 - Synaptopodin (glomerular)': `${rootTIFFUrl}Cy3 - Synaptopodin (glomerular).ome.tiff`,
    'Cy5 - THP (thick limb)': `${rootTIFFUrl}Cy5 - THP (thick limb).ome.tiff`,
    'DAPI - Hoescht (nuclei)': `${rootTIFFUrl}DAPI - Hoescht (nuclei).ome.tiff`,
    'FITC - Laminin (basement membrane)': `${rootTIFFUrl}FITC - Laminin (basement membrane).ome.tiff`
  }
};
