import { OrbitView } from '@deck.gl/core';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { test, expect } from 'vitest';
import VolumeLayer from '../src/volume-layer/volume-layer';

test('VolumeLayer - generateLayerTests', () => {
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
    assert: (value, msg) => expect(value).toBeTruthy(),
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
    onBeforeUpdate: ({ testCase }) => {
      // Vitest does not have t.comment, so use console.log
      console.log(testCase.title);
    }
  });
  testLayer({
    Layer: VolumeLayer,
    testCases,
    onError: (err) => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});

test('VolumeLayer - loader selection', () => {
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
        expect(state.data.length === 0).toBeTruthy();
      }
    },
    {
      updateProps: {
        selections: [1, 2]
      },
      onAfterUpdate: () =>
        expect(state.data.length === 8).toBeTruthy()
    }
  ];
  testLayer({
    Layer: VolumeLayer,
    testCases,
    onError: (err) => expect(err).toBeFalsy(),
    viewport: view.makeViewport({
      height: 4,
      width: 4,
      viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
    })
  });
});
