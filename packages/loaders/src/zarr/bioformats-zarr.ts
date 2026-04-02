import { fromString } from '../omexml';
import type { ZarrArray } from './lib/utils';
import {
  guessBioformatsLabels,
  guessTileSize,
  loadMultiscales
} from './lib/utils';
import ZarrPixelSource from './pixel-source';

export async function load(
  root: ZarrArray['store'],
  xmlSource: string | File | Response
) {
  let xmlSourceText: string;
  // If 'File' or 'Response', read as text.
  if (typeof xmlSource !== 'string') {
    xmlSourceText = await xmlSource.text();
  } else {
    xmlSourceText = xmlSource;
  }

  // Get metadata and multiscale data for _first_ image.
  const parsed = fromString(xmlSourceText);
  const images = parsed.images || [];
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  
  // Create a map of ROI IDs to ROI objects for quick lookup
  const roiMap = new Map(rois.map(roi => [roi.ID, roi]));
  
  // Add ROIs to the first image based on ROIRefs
  let imgMeta = images[0];
  if (imgMeta) {
    const imageROIRefs = roiRefs.filter(roiRef => {
      // ROIRefs might have an ImageRef or be associated with the image
      // For now, we'll include all ROIRefs since we don't have explicit image association
      return true; // TODO: Add proper image-ROI association logic
    });
    
    // Get the actual ROI objects referenced by the ROIRefs
    const imageROIs = imageROIRefs
      .map(roiRef => roiMap.get(roiRef.ID))
      .filter(Boolean);
    
    const { ROIRef: _omitROIRef, ...imgWithoutRefs } = imgMeta as any;
    imgMeta = { ...imgWithoutRefs, ROIs: imageROIs };
  }
  const { data } = await loadMultiscales(root, '0');

  const labels = guessBioformatsLabels(data[0], imgMeta);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels, tileSize));

  return {
    data: pyramid,
    metadata: imgMeta
  };
}
