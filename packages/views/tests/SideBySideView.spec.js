import { PolygonLayer } from '@deck.gl/layers';
import { test, expect, describe } from 'vitest';
import { ImageLayer, MultiscaleImageLayer, ScaleBarLayer } from '@vivjs/layers';
import { SideBySideView } from '../src';
import { defaultArguments, generateViewTests } from './VivView.spec';

generateViewTests(SideBySideView, defaultArguments);

test('SideBySideView layer type and props check', () => {
  const view = new SideBySideView(defaultArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } }
      ]
    },
    viewStates: {
      foo: {
        target: [0, 0, 0],
        zoom: 0
      }
    }
  });
  expect(layers[0] instanceof ImageLayer).toBeTruthy();
  expect(layers[1] instanceof PolygonLayer).toBeTruthy();
  expect(layers[2] instanceof ScaleBarLayer).toBeTruthy();
  expect(layers[0].props.viewportId).toBe(view.id);
});

test('SideBySideView layer with multiscale', () => {
  const view = new SideBySideView(defaultArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } },
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } },
      ],
    },
    viewStates: {
      foo: {
        target: [0, 0, 0],
        zoom: 0,
      },
    },
  });
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers[1] instanceof PolygonLayer).toBeTruthy();
  expect(layers[2] instanceof ScaleBarLayer).toBeTruthy();
  expect(layers[0].props.viewportId).toBe(view.id);
});

test('SideBySideView layer does not render scale bar without physical size', () => {
  const view = new SideBySideView(defaultArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [loader, loader],
    },
    viewStates: {
      foo: {
        target: [0, 0, 0],
        zoom: 0,
      },
    },
  });
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers[1] instanceof PolygonLayer).toBeTruthy();
  expect(layers.length === 2).toBeTruthy();
});

const generateZoomLockTest = (panLock, zoomLock) => {
  test(
    `SideBySideView ${panLock ? 'with' : 'without'} pan and ${
      zoomLock ? 'with' : 'without'
    } zoom lock.`,
    () => {
      const linkedId = 'bar';
      const view = new SideBySideView({
        ...defaultArguments,
        panLock,
        zoomLock,
        linkedIds: [linkedId],
      });
      const dx = 6;
      const dy = -5;
      const dZoom = 1;
      const currentViewState = {
        height: 10,
        width: 10,
        target: [0, 0, 0],
        zoom: 0,
      };
      const viewState = {
        id: linkedId,
        height: 10,
        width: 10,
        target: [0 + dx, 0 + dy, 0],
        zoom: 0 + dZoom,
      };
      const oldViewState = {
        id: linkedId,
        height: 10,
        width: 10,
        target: [0, 0, 0],
        zoom: 0,
      };
      const newViewState = view.filterViewState({
        currentViewState,
        oldViewState,
        viewState,
      });
      expect(newViewState.target[0]).toBe(panLock ? dx : 0);
      expect(newViewState.target[1]).toBe(panLock ? dy : 0);
      expect(newViewState.zoom).toBe(zoomLock ? dZoom : 0);
    }
  );
};

// We test all combinations.
generateZoomLockTest(true, false);
generateZoomLockTest(false, false);
generateZoomLockTest(true, true);
generateZoomLockTest(false, true);
