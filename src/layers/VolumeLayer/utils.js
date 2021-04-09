import { getImageSize } from '../../loaders/utils';

/**
 * Creates a single continguous TypedArray that can visualized as a volume in 3D space where the y-axis going up is positive,
 * the x-axis going right is positive, and the z-axis coming out of the screen is positive.
 * To do this, and keep the orientation, we must anti-diagonally transpose each slice of raster data so that the (0, 0) data point is transformed
 * to the top right.  If you start the camera looking at the 0th slice (or rotate from looking at the final slice) in 3D, this becomes more apparent.
 * Of note here is that in 2D rendering, the y-axis is positive in the downward direction.
 *
 * @param {object} props
 * @param {object} props.source PixelSource
 * @param {object} props.selection A single selection for the PixelSource
 * @param {object} props.onUpdate A callback for progress that is called twice during the loading of each plane, once when the promsie resolves and once when it is loaded into the final contiguous buffer.
 * @param {object} props.downsampleDepth This is the number by which to downsample on the z direction, usually `2 ** resolution` where `resolution` is that of the `PixelSource` in the image pyramid.
 * The idea here is to get every `downsampleDepth` raster slice so that proper scaling is maintained (just liek a 2D image pyramid).
 * @return {TypedArray}
 * @ignore
 */
export async function getVolume({
  source,
  selection,
  onUpdate = () => {},
  downsampleDepth = 1
}) {
  const { shape, labels, dtype } = source;
  const { height, width } = getImageSize(source);
  const depth = shape[labels.indexOf('z')];
  const depthDownsampled = Math.floor(depth / downsampleDepth);
  const rasterSize = height * width;
  const name = `${dtype}Array`;
  const TypedArray = globalThis[name];
  const volumeData = new TypedArray(rasterSize * depthDownsampled);
  await Promise.all(
    new Array(depthDownsampled).fill(0).map(async (_, z) => {
      const depthSelection = {
        ...selection,
        z: z * downsampleDepth
      };
      const { data: rasterData } = await source.getRaster({
        selection: depthSelection
      });
      let r = 0;
      onUpdate();
      // For now this process fills in each raster plane anti-diagonally transposed.
      // This is to ensure that the image looks right in three dimensional space.
      while (r < rasterSize) {
        const volIndex = z * rasterSize + (rasterSize - r - 1);
        const rasterIndex =
          ((width - r - 1) % width) + width * Math.floor(r / width);
        volumeData[volIndex] = rasterData[rasterIndex];
        r += 1;
      }
      onUpdate();
    })
  );
  return {
    data: volumeData,
    height,
    width,
    depth: depthDownsampled
  };
}
