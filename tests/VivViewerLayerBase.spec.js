/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { OrthographicView } from '@deck.gl/core';
import VivViewerLayerBase from '../src/layers/VivViewerLayer/VivViewerLayerBase';

test('VivViewerLayerBase', t => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const testCases = generateLayerTests({
    Layer: VivViewerLayerBase,
    assert: t.ok,
    sampleProps: {
      sliderValues: [0, 10],
      colorValues: [0, 1, 1],
      tileSize: 2,
      imageWidth: 4,
      imageHeight: 4
    },
    onBeforeUpdate: ({ testCase }) => t.comment(testCase.title)
  });
  testLayer({
    Layer: VivViewerLayerBase,
    testCases,
    onError: t.notOkimport,
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
  t.end();
});
