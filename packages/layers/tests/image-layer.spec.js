import { OrthographicView } from '@deck.gl/core';
import { generateLayerTests, testLayer } from '@deck.gl/test-utils';
import { describe, it, expect } from 'vitest';
import ImageLayer from '../src/image-layer';

// First test suite

describe('ImageLayer', () => {
  it('basic layer test', async () => {
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
      assert: (value, msg) => expect(value).toBeTruthy(),
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
      onBeforeUpdate: ({ testCase }) => console.log(testCase.title)
    });
    testLayer({
      Layer: ImageLayer,
      testCases,
      onError: (err) => expect(err).toBeUndefined(),
      viewport: view.makeViewport({
        height: 4,
        width: 4,
        viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
      })
    });
  });

  // Second test suite
  it('loader selection test', async () => {
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
          expect(state.data.length).toBe(0);
        }
      },
      {
        updateProps: {
          selections: [1, 2]
        },
        onAfterUpdate: () => {
          expect(state.data.length).toBe(2);
        }
      }
    ];
    testLayer({
      Layer: ImageLayer,
      testCases,
      onError: (err) => expect(err).toBeUndefined(),
      viewport: view.makeViewport({
        height: 4,
        width: 4,
        viewState: { target: [2, 2, 0], zoom: 0, width: 4, height: 4 }
      })
    });
  });
});
