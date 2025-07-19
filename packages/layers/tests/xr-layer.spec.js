import { OrthographicView } from '@deck.gl/core';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { expect, test } from 'vitest';
import XRLayer from '../src/xr-layer/xr-layer';

test('XRLayer', () => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const testCases = generateLayerTests({
    Layer: XRLayer,
    assert: (value, msg) => expect(value).toBeTruthy(),
    sampleProps: {
      bounds: [0, 0, 2, 2],
      contrastLimits: [[0, 10]],
      channelsVisible: [true],
      tileSize: 2,
      channelData: {
        data: [new Uint32Array([0, 2, 1, 2])],
        width: 2,
        height: 2
      },
      dtype: 'Uint32'
    },
    onBeforeUpdate: ({ testCase }) => {
      // Vitest does not have t.comment, so use console.log
      console.log(testCase.title);
    }
  });
  testLayer({
    Layer: XRLayer,
    testCases,
    onError: err => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});
