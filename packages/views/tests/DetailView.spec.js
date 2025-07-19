import { MultiscaleImageLayer, ScaleBarLayer } from '@vivjs/layers';
import { test, expect } from 'vitest';
import { DETAIL_VIEW_ID, DetailView } from '../src';
import { defaultArguments, generateViewTests } from './VivView.spec';

const id = DETAIL_VIEW_ID;
const detailViewArguments = { ...defaultArguments };
detailViewArguments.initialViewState = { ...defaultArguments.initialViewState };
detailViewArguments.initialViewState.id = id;

generateViewTests(DetailView, detailViewArguments);

test('DetailView layer type and props check', () => {
  const view = new DetailView(detailViewArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } },
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } },
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } }
      ]
    },
    viewStates: {
      detail: {
        target: [0, 0, 0],
        zoom: 0
      }
    }
  });
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers[1] instanceof ScaleBarLayer).toBeTruthy();
  expect(layers[0].props.viewportId).toBe(view.id);
});

test('DetailView does not render scale bar without physical size', () => {
  const view = new DetailView(detailViewArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [loader, loader]
    },
    viewStates: {
      detail: {
        target: [0, 0, 0],
        zoom: 0
      }
    }
  });
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers.length === 1).toBeTruthy();
});
