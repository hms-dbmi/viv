import { OrthographicView } from '@deck.gl/core';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { test, expect } from 'vitest';
import ScaleBarLayer from '../src/scale-bar-layer';

test('ScaleBarLayer', () => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const testCases = generateLayerTests({
    Layer: ScaleBarLayer,
    assert: (value, msg) => expect(value).toBeTruthy(),
    sampleProps: {
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 },
      unit: 'cm',
      size: 1,
      position: 'bottom-left'
    },
    onBeforeUpdate: ({ testCase }) => {
      // Vitest does not have t.comment, so use console.log
      console.log(testCase.title);
    }
  });
  testLayer({
    Layer: ScaleBarLayer,
    testCases,
    onError: (err) => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});
