// const rootTIFFUrl =
//   'https://vitessce-data.storage.googleapis.com/vanderbilt.images/';
// export const source = {
//   channels: {
//     'Cy3 - Synaptopodin (glomerular)': `${rootTIFFUrl}Cy3 - Synaptopodin (glomerular).ome.tiff`,
//     'Cy5 - THP (thick limb)': `${rootTIFFUrl}Cy5 - THP (thick limb).ome.tiff`,
//     'DAPI - Hoescht (nuclei)': `${rootTIFFUrl}DAPI - Hoescht (nuclei).ome.tiff`,
//     'FITC - Laminin (basement membrane)': `${rootTIFFUrl}FITC - Laminin (basement membrane).ome.tiff`
//   }
// };


const rootZarrUrl = 'https://vitessce-demo-data.storage.googleapis.com/test-data/vanderbilt-data/vanderbilt_mxif_ims.zarr/mxif_pyramid';

export const source = {
  channels: {
    'Cy3 - Synaptopodin (glomerular)': rootZarrUrl,
    'Cy5 - THP (thick limb)': rootZarrUrl,
    'DAPI - Hoescht (nuclei)': rootZarrUrl,
    'FITC - Laminin (basement membrane)': rootZarrUrl
  }
};