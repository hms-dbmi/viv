import test from 'tape-catch';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { OrbitView } from '@deck.gl/core';
import VolumeLayer from '../src/volume-layer/volume-layer';

test('VolumeLayer', t => {
  const view = new OrbitView({
    id: 'ortho',
    controller: true,
    height: 4,
    width: 4,
    target: [2, 2, 0],
    zoom: 0
  });
  const testCases = generateLayerTests({
    Layer: VolumeLayer,
    assert: t.ok,
    sampleProps: {
      contrastLimits: [
        [0, 10],
        [0, 10]
      ],
      colors: [
        [0, 1, 1],
        [0, 1, 1]
      ],
      channelsVisible: [true, false],
      loader: [
        {
          getRaster: async () => ({
            data: new Uint32Array([0, 2, 1, 2]),
            width: 2,
            height: 2
          }),
          shape: [1, 1, 4, 2, 2],
          labels: ['t', 'c', 'z', 'y', 'x'],
          dtype: 'Uint32'
        },
        {
          getRaster: async () => ({
            data: new Uint32Array([0, 2, 1, 2]),
            width: 2,
            height: 2
          }),
          shape: [1, 1, 4, 2, 2],
          labels: ['t', 'c', 'z', 'y', 'x'],
          dtype: 'Uint32'
        }
      ],
      selections: [{}, {}]
    },
    onBeforeUpdate: ({ testCase }) => t.comment(testCase.title)
  });
  testLayer({
    Layer: VolumeLayer,
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

test('VolumeLayer', t => {
  const view = new OrbitView({
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
        colors: [
          [0, 1, 1],
          [0, 1, 1]
        ],
        channelsVisible: [true, false],
        loader: [
          {
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
            shape: [1, 1, 4, 2, 2],
            labels: ['t', 'c', 'z', 'y', 'x'],
            dtype: 'Uint32'
          },
          {
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
            shape: [1, 1, 4, 2, 2],
            labels: ['t', 'c', 'z', 'y', 'x'],
            dtype: 'Uint32'
          }
        ],
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
        t.ok(state.data.length === 8, 'Updated loader selection requests data.')
    }
  ];
  testLayer({
    Layer: VolumeLayer,
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
