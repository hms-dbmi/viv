/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { OrbitView } from '@deck.gl/core';
import VolumeLayer from '../../../src/layers/VolumeLayer';

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
      sliderValues: [
        [0, 10],
        [0, 10]
      ],
      colorValues: [
        [0, 1, 1],
        [0, 1, 1]
      ],
      channelIsOn: [true, false],
      loader: [
        {
          getRaster: async () => ({
            data: new Uint32Array([0, 2, 1, 2]),
            width: 2,
            height: 2
          }),
          shape: [4, 1, 1, 2, 2],
          labels: ['z', 'c', 't', 'x', 'y'],
          dtype: 'Uint32'
        },
        {
          getRaster: async () => ({
            data: new Uint32Array([0, 2, 1, 2]),
            width: 2,
            height: 2
          }),
          shape: [4, 1, 1, 2, 2],
          labels: ['z', 'c', 't', 'x', 'y'],
          dtype: 'Uint32'
        }
      ],
      loaderSelection: [{}, {}]
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
        sliderValues: [
          [0, 10],
          [0, 10]
        ],
        colorValues: [
          [0, 1, 1],
          [0, 1, 1]
        ],
        channelIsOn: [true, false],
        loader: [
          {
            getRaster: async () => {
              state.data.push(new Uint32Array([0, 2, 1, 2]));
              state.width = 2;
              state.width = 2;
            },
            shape: [4, 1, 1, 2, 2],
            labels: ['z', 'c', 't', 'x', 'y'],
            dtype: 'Uint32'
          },
          {
            getRaster: async () => {
              state.data.push(new Uint32Array([0, 2, 1, 2]));
              state.width = 2;
              state.width = 2;
            },
            shape: [4, 1, 1, 2, 2],
            labels: ['z', 'c', 't', 'x', 'y'],
            dtype: 'Uint32'
          }
        ],
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
