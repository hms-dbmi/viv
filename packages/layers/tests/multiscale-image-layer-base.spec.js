import test from 'tape-catch';
import { generateLayerTests, testLayerAsync } from '@deck.gl/test-utils';
import { OrthographicView } from '@deck.gl/core';
import MultiscaleImageLayerBase from '../src/multiscale-image-layer/multiscale-image-layer-base';
import BitmapLayer from '../src/bitmap-layer';

test('MultiscaleImageLayerBase', async t => {
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
    assert: t.ok,
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
    onBeforeUpdate: ({ testCase }) => t.comment(testCase.title),
    onAfterUpdate: ({ subLayers }) =>
      t.ok(
        subLayers.length > 0
          ? subLayers.every(layer => layer.constructor.name === 'XRLayer')
          : true
      )
  });
  await testLayerAsync({
    Layer: MultiscaleImageLayerBase,
    testCases,
    onError: t.notOk,
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
  t.end();
});

test('MultiscaleImageLayerBaseBitmapLayer', async t => {
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
    assert: t.ok,
    sampleProps: {
      // eslint-disable-next-line no-unused-vars
      getTileData,
      loader: [
        {
          dtype: 'Uint8',
          shape: [1, 1, 1, 2, 2, 4],
          meta: { photometricInterpretation: 0 }
        }
      ]
    },
    onBeforeUpdate: ({ testCase }) => t.comment(testCase.title),
    onAfterUpdate: ({ subLayers }) =>
      t.ok(
        subLayers.length > 0
          ? subLayers.every(layer => layer instanceof BitmapLayer)
          : true
      )
  });
  await testLayerAsync({
    Layer: MultiscaleImageLayerBase,
    testCases,
    onError: t.notOk,
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
  t.end();
});
