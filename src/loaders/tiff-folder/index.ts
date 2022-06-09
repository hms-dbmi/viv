import { fromBlob, fromUrl } from 'geotiff';
import { load, TiffFolderChannel } from './tiff-folder';
import {getParsedFilename, csvStringToArray} from './lib/utils';

interface TiffFolderOptions {
  fetchOptions: RequestInit;
}

/**
 * Opens a folder of multiple tiffs each containing one image (no stacks, timepoints, or pyramids).
 * Loads each tiff as a channel in a pixel source called TiffFolderPixelSource.
 * Expects one of two possible inputs:
 * 
 * string - a URL to a CSV file that contains the URLs of the channel tiffs in the first column,
 * and the (optional) channel names in the second column. If no channel name is provided then
 * the filename will be used as the channel name.
 * 
 * (File & { path: string })[] - A list of file objects paired with their paths. In this case
 * the parent folder name of the first image will be used as the image name and the filenames
 * will be used to as the channel names.
 * 
 * @param {string | File[]} source url or files with paths
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: TiffFolderPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
export async function loadTiffFolder(
  source: string | (File & { path: string })[],
  options: Partial<TiffFolderOptions> = {}
) {
  let imageName: string | undefined;
  const channels: TiffFolderChannel[] = [];
  // Load from a URL pointing to a CSV.
  if (typeof source === 'string') {
    const sourceFilename = getParsedFilename(source);

    if(sourceFilename.filename && sourceFilename.extension?.toLowerCase() === 'csv'){
      imageName = sourceFilename.filename;
      const csvSource = await (await fetch(source, options.fetchOptions)).text();
      const parsedCsv = csvStringToArray(csvSource);

      for (const row of parsedCsv){
        const imagePath = row[0];
        const name = row[1] ? row[1] : getParsedFilename(imagePath).filename;

        if(imagePath && name){
          const tiff = await fromUrl(source, { cacheSize: Infinity });
          channels.push({name, tiff});
        }
      }
    }
  } else {
    // Load from a list of file objects.
    if (source[0]) imageName = source[0].path.split('/')[-2];
    for(const file of source){
      const name = getParsedFilename(file.path).filename;
      if(name){
        const tiff = await fromBlob(file);
        channels.push({name, tiff});
      }
    }
  }
  if(imageName && channels.length > 0){
    return load(imageName, channels);
  } 
  throw new Error('Unable to load image from provided TiffFolder source.');
}