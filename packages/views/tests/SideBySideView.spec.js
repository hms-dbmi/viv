import { PolygonLayer } from '@deck.gl/layers';
import { ImageLayer, MultiscaleImageLayer } from '@vivjs/layers';
import { describe, expect, test } from 'vitest';
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
  expect(layers[0].props.viewportId).toBe(view.id);
});

test('SideBySideView layer with multiscale', () => {
  const view = new SideBySideView(defaultArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [
        { ...loader, meta: { physicalSizes: { x: { value: 1, unit: 'cm' } } } },
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
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers[1] instanceof PolygonLayer).toBeTruthy();
  expect(layers[0].props.viewportId).toBe(view.id);
});

test('SideBySideView layer does not render scale bar without physical size', () => {
  const view = new SideBySideView(defaultArguments);
  const loader = { type: 'loads' };
  const layers = view.getLayers({
    props: {
      loader: [loader, loader]
    },
    viewStates: {
      foo: {
        target: [0, 0, 0],
        zoom: 0
      }
    }
  });
  expect(layers[0] instanceof MultiscaleImageLayer).toBeTruthy();
  expect(layers[1] instanceof PolygonLayer).toBeTruthy();
  expect(layers.length === 2).toBeTruthy();
});

const generateZoomLockTest = (panLock, zoomLock) => {
  test(`SideBySideView ${panLock ? 'with' : 'without'} pan and ${
    zoomLock ? 'with' : 'without'
  } zoom lock.`, () => {
    const linkedId = 'bar';
    const view = new SideBySideView({
      ...defaultArguments,
      panLock,
      zoomLock,
      linkedIds: [linkedId]
    });
    const dx = 6;
    const dy = -5;
    const dZoom = 1;
    const currentViewState = {
      height: 10,
      width: 10,
      target: [0, 0, 0],
      zoom: 0
    };
    const viewState = {
      id: linkedId,
      height: 10,
      width: 10,
      target: [0 + dx, 0 + dy, 0],
      zoom: 0 + dZoom
    };
    const oldViewState = {
      id: linkedId,
      height: 10,
      width: 10,
      target: [0, 0, 0],
      zoom: 0
    };
    const newViewState = view.filterViewState({
      currentViewState,
      oldViewState,
      viewState
    });
    expect(newViewState.target[0]).toBe(panLock ? dx : 0);
    expect(newViewState.target[1]).toBe(panLock ? dy : 0);
    expect(newViewState.zoom).toBe(zoomLock ? dZoom : 0);
  });
};

// We test all combinations.
generateZoomLockTest(true, false);
generateZoomLockTest(false, false);
generateZoomLockTest(true, true);
generateZoomLockTest(false, true);

test('filterViewState applies zoom lock using zoomX/zoomY from deck.gl v9+', () => {
  const linkedId = 'right';
  const view = new SideBySideView({
    ...defaultArguments,
    id: 'left',
    height: 400,
    width: 300,
    panLock: true,
    zoomLock: true,
    linkedIds: [linkedId]
  });
  const out = view.filterViewState({
    currentViewState: {
      height: 400,
      width: 300,
      target: [100, 200, 0],
      zoom: 1
    },
    oldViewState: {
      id: linkedId,
      zoom: 0,
      zoomX: 0,
      zoomY: 0,
      target: [50, 60, 0]
    },
    viewState: {
      id: linkedId,
      zoom: 0,
      zoomX: 2,
      zoomY: 2,
      target: [50, 60, 0]
    }
  });
  expect(out.zoom).toBe(3);
  expect(out).not.toHaveProperty('zoomX');
  expect(out).not.toHaveProperty('zoomY');
});

test('filterViewState applies leader delta from reliable previous state', () => {
  const view = new SideBySideView({
    ...defaultArguments,
    id: 'right',
    height: 400,
    width: 300,
    panLock: true,
    zoomLock: true,
    linkedIds: ['left']
  });
  const out = view.filterViewState({
    currentViewState: {
      height: 400,
      width: 300,
      target: [1713.74, 1093.32, 0],
      zoom: -1.637976
    },
    oldViewState: {
      id: 'left',
      zoom: -1.637976,
      target: [1713.74, 1093.32, 0]
    },
    viewState: {
      id: 'left',
      zoom: -1.613981,
      target: [1708.29, 1088.32, 0]
    }
  });
  expect(out.zoom).toBeCloseTo(-1.613981, 5);
  expect(out.target[0]).toBeCloseTo(1708.29, 2);
  expect(out.target[1]).toBeCloseTo(1088.32, 2);
});

test('filterViewState preserves intentional pan offset between linked views', () => {
  const view = new SideBySideView({
    ...defaultArguments,
    id: 'right',
    height: 400,
    width: 300,
    panLock: true,
    zoomLock: false,
    linkedIds: ['left']
  });
  const out = view.filterViewState({
    currentViewState: {
      height: 400,
      width: 300,
      target: [200, 200, 0],
      zoom: 0
    },
    oldViewState: {
      id: 'left',
      zoom: 0,
      target: [100, 100, 0]
    },
    viewState: {
      id: 'left',
      zoom: 0,
      target: [110, 105, 0]
    }
  });
  expect(out.target[0]).toBe(210);
  expect(out.target[1]).toBe(205);
  expect(out.zoom).toBe(0);
});

test('filterViewState keeps each view panel width/height, not deck canvas size', () => {
  const view = new SideBySideView({
    ...defaultArguments,
    id: 'left',
    height: 400,
    width: 300
  });
  const out = view.filterViewState({
    currentViewState: {
      height: 400,
      width: 300,
      target: [0, 0, 0],
      zoom: 0
    },
    viewState: {
      id: 'left',
      height: 800,
      width: 1200,
      target: [10, 20, 0],
      zoom: -2,
      zoomX: -2,
      zoomY: -2
    }
  });
  expect(out.width).toBe(300);
  expect(out.height).toBe(400);
  expect(out.zoom).toBe(-2);
  expect(out).not.toHaveProperty('zoomX');
});
