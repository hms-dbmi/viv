/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { OrthographicView } from '@deck.gl/core';
import ImageLayer from '../../../src/layers/ImageLayer';

test('ImageLayer', t => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const testCases = generateLayerTests({
    Layer: ImageLayer,
    assert: t.ok,
    sampleProps: {
      sliderValues: [
        [0, 10],
        [0, 10]
      ],
      colorValues: [
        [0, 1, 1],
        [0, 1, 1]
      ],
      channelIsOn: [true, false],
      loader: {
        getRaster: async () => ({
          data: [new Uint32Array([0, 2, 1, 2]), new Uint32Array([1, 2, 1, 2])],
          width: 2,
          height: 2
        }),
        dtype: '<u4'
      },
      loaderSelection: null
    },
    onBeforeUpdate: ({ testCase }) => t.comment(testCase.title)
  });
  testLayer({
    Layer: ImageLayer,
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

test('ImageLayer', t => {
  const view = new OrthographicView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  let state = {};
  const testCases = [
    {
      props: {
        sliderValues: [
          [0, 10],
          [0, 10]
        ],
        colorValues: [
          [0, 1, 1],
          [0, 1, 1]
        ],
        channelIsOn: [true, false],
        loader: {
          getRaster: async ({ loaderSelection }) => {
            state = {
              data: loaderSelection.map(() => new Uint32Array([0, 2, 1, 2])),
              width: 2,
              height: 2
            };
          },
          dtype: '<u4'
        },
        loaderSelection: []
      },
      onAfterUpdate: () => {
        t.ok(
          state.data.length === 0,
          'Empty loader selection produces no data.'
        );
      }
    },
    {
      updateProps: {
        loaderSelection: [1, 2]
      },
      onAfterUpdate: () =>
        t.ok(state.data.length === 2, 'Updated loader selection requests data.')
    }
  ];
  testLayer({
    Layer: ImageLayer,
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
