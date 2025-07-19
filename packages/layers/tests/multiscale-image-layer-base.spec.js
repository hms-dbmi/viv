import { OrthographicView } from '@deck.gl/core';
import { generateLayerTests, testLayerAsync } from '@deck.gl/test-utils';
import { test, expect } from 'vitest';
import BitmapLayer from '../src/bitmap-layer';
import MultiscaleImageLayerBase from '../src/multiscale-image-layer/multiscale-image-layer-base';

test('MultiscaleImageLayerBase', async () => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const getTileData = async () => ({
    data: new Uint8Array([0, 0, 0, 2]),
    width: 2,
    height: 2
  });
  const testCases = generateLayerTests({
    Layer: MultiscaleImageLayerBase,
    assert: (value, msg) => expect(value).toBeTruthy(),
    sampleProps: {
      contrastLimits: [[0, 10]],
      channelsVisible: [true],
      tileSize: 2,
      loader: [
        {
          dtype: 'Uint32',
          shape: [1, 1, 1, 2, 2]
        }
      ],
      dtype: 'Uint32',
      getTileData
    },
    onBeforeUpdate: ({ testCase }) => {
      // Vitest does not have t.comment, so use console.log
      console.log(testCase.title);
    },
    onAfterUpdate: ({ subLayers }) => {
      expect(
        subLayers.length > 0
          ? subLayers.every(layer => layer.constructor.name === 'XRLayer')
          : true
      ).toBeTruthy();
    }
  });
  await testLayerAsync({
    Layer: MultiscaleImageLayerBase,
    testCases,
    onError: (err) => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});

test('MultiscaleImageLayerBaseBitmapLayer', async () => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const getTileData = async () => ({
    data: new Uint8Array([0, 0, 0, 2, 2, 2, 1, 1, 1, 2, 2, 2]),
    width: 2,
    height: 2
  });
  const testCases = generateLayerTests({
    Layer: MultiscaleImageLayerBase,
    assert: (value, msg) => expect(value).toBeTruthy(),
    sampleProps: {
      getTileData,
      loader: [
        {
          dtype: 'Uint8',
          shape: [1, 1, 1, 2, 2, 4],
          meta: { photometricInterpretation: 0 }
        }
      ]
    },
    onBeforeUpdate: ({ testCase }) => {
      // Vitest does not have t.comment, so use console.log
      console.log(testCase.title);
    },
    onAfterUpdate: ({ subLayers }) => {
      expect(
        subLayers.length > 0
          ? subLayers.every(layer => layer instanceof BitmapLayer)
          : true
      ).toBeTruthy();
    }
  });
  await testLayerAsync({
    Layer: MultiscaleImageLayerBase,
    testCases,
    onError: (err) => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});
