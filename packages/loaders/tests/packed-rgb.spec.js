import * as fs from 'node:fs';
import { expect, test } from 'vitest';

import { loadOmeTiff } from '../src/tiff';
import {
  PHOTOMETRIC_RGB,
  PHOTOMETRIC_YCBCR,
  isPackedRgbTiffImage,
  isPlanarRgbTiffImage,
  padTiffSampleTags
} from '../src/tiff/lib/utils';
import { isInterleaved } from '../src/utils';

test('padTiffSampleTags pads short SampleFormat/BitsPerSample to spp', () => {
  const fd = {
    SamplesPerPixel: 3,
    BitsPerSample: [8],
    SampleFormat: [1]
  };
  padTiffSampleTags(fd);
  expect(fd.BitsPerSample).toEqual([8, 8, 8]);
  expect(fd.SampleFormat).toEqual([1, 1, 1]);
});

test('padTiffSampleTags is a no-op when tags are already long enough', () => {
  const fd = {
    SamplesPerPixel: 3,
    BitsPerSample: [8, 8, 8],
    SampleFormat: [1, 1, 1]
  };
  padTiffSampleTags(fd);
  expect(fd.BitsPerSample).toEqual([8, 8, 8]);
  expect(fd.SampleFormat).toEqual([1, 1, 1]);
});

test('padTiffSampleTags fills missing SampleFormat from fallback', () => {
  const fd = {
    SamplesPerPixel: 3,
    BitsPerSample: [8, 8, 8]
  };
  padTiffSampleTags(fd);
  expect(fd.SampleFormat).toEqual([1, 1, 1]);
});

test('detects packed chunky RGB / YCbCr and planar RGB; ignores fluorescence', () => {
  expect(
    isPackedRgbTiffImage({
      fileDirectory: {
        SamplesPerPixel: 3,
        PhotometricInterpretation: PHOTOMETRIC_YCBCR,
        PlanarConfiguration: 1
      }
    })
  ).toBe(true);

  expect(
    isPackedRgbTiffImage({
      fileDirectory: {
        SamplesPerPixel: 3,
        PhotometricInterpretation: PHOTOMETRIC_RGB,
        PlanarConfiguration: 2
      }
    })
  ).toBe(true);

  expect(
    isPlanarRgbTiffImage({
      fileDirectory: {
        SamplesPerPixel: 3,
        PhotometricInterpretation: PHOTOMETRIC_RGB,
        PlanarConfiguration: 2
      }
    })
  ).toBe(true);

  expect(
    isPlanarRgbTiffImage({
      fileDirectory: {
        SamplesPerPixel: 3,
        PhotometricInterpretation: PHOTOMETRIC_YCBCR,
        PlanarConfiguration: 1
      }
    })
  ).toBe(false);

  // Fluorescence: BlackIsZero + spp=1
  expect(
    isPackedRgbTiffImage({
      fileDirectory: {
        SamplesPerPixel: 1,
        PhotometricInterpretation: 1,
        BitsPerSample: [8]
      }
    })
  ).toBe(false);
});

const HE_CHUNKY = '/Users/simon/Research/cycif-data/HE/LSP16103.ome.tif';
const HE_PLANAR =
  '/Users/simon/Research/cycif-data/HE/LSP12653_20220330_192452_040060.ome.tiff';

async function assertPackedRgbContract(sourcePath, photometric) {
  const { data, metadata } = await loadOmeTiff(`file://${sourcePath}`);
  const [base] = data;
  expect(base.dtype).toBe('Uint8');
  expect(base.labels).toEqual(expect.arrayContaining(['c', 'y', 'x', '_c']));
  expect(base.labels[base.labels.length - 1]).toBe('_c');
  expect(base.shape[base.labels.indexOf('c')]).toBe(1);
  expect(base.shape[base.shape.length - 1]).toBe(3);
  expect(isInterleaved(base.shape)).toBe(true);
  expect(metadata.Pixels.SizeC).toBe(1);
  expect(metadata.Pixels.Channels.length).toBe(1);
  expect(metadata.Pixels.Channels[0].SamplesPerPixel).toBe(3);
  expect(metadata.Pixels.Type).toBe('Uint8');
  expect(base.meta.photometricInterpretation).toBe(photometric);

  // One tile only — these pyramids are multi-GB; avoid full getRaster.
  const tile = await base.getTile({
    x: 0,
    y: 0,
    selection: { c: 0, t: 0, z: 0 }
  });
  expect(tile.data.length).toBe(tile.width * tile.height * 3);
}

test.skipIf(!fs.existsSync(HE_CHUNKY))(
  'optional: LSP16103 packed YCbCr JPEG RGB loads as interleaved SizeC=1',
  async () => {
    await assertPackedRgbContract(HE_CHUNKY, PHOTOMETRIC_YCBCR);
  }
);

test.skipIf(!fs.existsSync(HE_CHUNKY))(
  'optional: LSP16103 pyramid shapes match SubIFD sizes (4x, not binary)',
  async () => {
    const { data } = await loadOmeTiff(`file://${HE_CHUNKY}`);
    const widths = data.map(s => s.shape[s.labels.indexOf('x')]);
    const heights = data.map(s => s.shape[s.labels.indexOf('y')]);
    expect(widths).toEqual([102039, 25510, 6378, 1595, 399]);
    expect(heights).toEqual([76379, 19095, 4774, 1194, 299]);
    // Deck.gl zooms are ~0, -2, -4, -6, -8 for a 4x pyramid.
    const zooms = widths.map(
      w => 0 - Math.round(Math.log2(widths[0] / w))
    );
    expect(zooms).toEqual([0, -2, -4, -6, -8]);
  }
);

test.skipIf(!fs.existsSync(HE_PLANAR))(
  'optional: LSP12653 planar RGB loads as interleaved SizeC=1',
  async () => {
    await assertPackedRgbContract(HE_PLANAR, PHOTOMETRIC_RGB);
  }
);

test.skipIf(!fs.existsSync(HE_PLANAR))(
  'optional: LSP12653 pyramid shapes match SubIFD sizes (2x)',
  async () => {
    const { data } = await loadOmeTiff(`file://${HE_PLANAR}`);
    const widths = data.map(s => s.shape[s.labels.indexOf('x')]);
    expect(widths[0]).toBe(29857);
    expect(widths[1]).toBe(14928);
    const zooms = widths.map(
      w => 0 - Math.round(Math.log2(widths[0] / w))
    );
    expect(zooms).toEqual([0, -1, -2, -3, -4, -5]);
  }
);
