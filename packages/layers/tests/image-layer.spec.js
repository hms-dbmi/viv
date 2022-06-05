import test from 'tape-catch';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { OrthographicView } from '@deck.gl/core';
import ImageLayer from '../src/image-layer';

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
    props: {
      contrastLimits: [
        [0, 10],
        [0, 10]
      ],
      channelsVisible: [true, false],
      loader: {
        async getRaster() {
          return {
            data: new Uint32Array([0, 2, 1, 2]),
            width: 2,
            height: 2
          };
        },
        dtype: 'Uint32',
        shape: [2, 2, 2]
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
            const raster = {
              data: new Uint32Array([0, 2, 1, 2]),
              width: 2,
              height: 2
            };
            state.data.push(raster.data);
            state.data.width = raster.width;
            state.data.height = raster.height;
            return raster;
          },
          dtype: 'Uint32',
          shape: [2, 2, 2]
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
