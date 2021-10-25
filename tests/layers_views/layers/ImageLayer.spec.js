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
      contrastLimits: [
        [0, 10],
        [0, 10]
      ],
      channelsVisible: [true, false],
      loader: {
        getRaster: async () => ({
          data: new Uint32Array([0, 2, 1, 2]),
          width: 2,
          height: 2
        }),
        dtype: 'Uint32'
      },
      selections: [{}, {}]
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
  const state = { data: [], width: 0, height: 0 };
  const testCases = [
    {
      props: {
        contrastLimits: [
          [0, 10],
          [0, 10]
        ],
        channelsVisible: [true, false],
        loader: {
          getRaster: async () => {
            state.data.push(new Uint32Array([0, 2, 1, 2]));
            state.width = 2;
            state.width = 2;
          },
          dtype: 'Uint32'
        },
        selections: []
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
        selections: [1, 2]
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
