import { getDims } from '../../zarr/lib/utils';
import type { OMEXML } from '../../omexml';

export function getPixelSourceMeta({ Pixels }: OMEXML[0]) {
  // e.g. 'XYZCT' -> ['t', 'c', 'z', 'y', 'x']
  const labels = Pixels.DimensionOrder.toLowerCase().split('').reverse();

  // Compute "shape" of image
  const dims = getDims(labels);
  const shape: number[] = Array(labels.length).fill(0);
  shape[dims('t')] = Pixels.SizeT;
  shape[dims('c')] = Pixels.SizeC;
  shape[dims('z')] = Pixels.SizeZ;

  // Push extra dimension if data are interleaved.
  if (Pixels.Interleaved) {
    labels.push('_c');
    shape.push(3);
  }

  // Creates a new shape for different level of pyramid.
  // Assumes factor-of-two downsampling.
  const getShape = (level: number) => {
    const s = [...shape];
    s[dims('x')] = Pixels.SizeX >> level;
    s[dims('y')] = Pixels.SizeY >> level;
    return s;
  };

  if (Pixels.PhysicalSizeX && Pixels.PhysicalSizeY) {
    const physicalSizes = {
      x: {
        size: Pixels.PhysicalSizeX,
        unit: Pixels.PhysicalSizeXUnit 
      },
      y: {
        size: Pixels.PhysicalSizeY,
        unit: Pixels.PhysicalSizeYUnit,
      }
    }
    return { labels, getShape, physicalSizes };
  }

  return { labels, getShape };
}
