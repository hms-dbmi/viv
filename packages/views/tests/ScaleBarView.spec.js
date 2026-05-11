import { ScaleBarLayer } from '@vivjs/layers';
import { expect, test } from 'vitest';
import { SCALEBAR_VIEW_ID, ScaleBarView } from '../src';
import { defaultArguments, generateViewTests } from './VivView.spec';

const id = SCALEBAR_VIEW_ID;
const loader = [
  {
    meta: { physicalSizes: { x: { size: 10, unit: 'nm' } } }
  }
];
const scalebarViewArgs = {
  ...defaultArguments,
  loader,
  imageViewId: 'detail'
};
scalebarViewArgs.initialViewState = { ...defaultArguments.initialViewState };
scalebarViewArgs.initialViewState.id = id;

generateViewTests(ScaleBarView, scalebarViewArgs);

test('ScaleBarView layer type check', () => {
  const view = new ScaleBarView(scalebarViewArgs);
  const layers = view.getLayers({
    viewStates: {
      detail: {
        target: [0, 0, 0],
        zoom: 0
      }
    }
  });
  expect(layers[0] instanceof ScaleBarLayer).toBeTruthy();
});

test('filterViewState does not inherit zoomX/zoomY from the tracked image view', () => {
  const view = new ScaleBarView({
    id: SCALEBAR_VIEW_ID,
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    loader: [
      {
        meta: { physicalSizes: { x: { size: 1, unit: 'm' } } } }
    ],
    imageViewId: 'detail',
    position: 'bottom-right',
    length: 0.05,
    snap: false
  });
  const out = view.filterViewState({
    viewState: {
      id: 'detail',
      zoom: -4,
      zoomX: -4,
      zoomY: -4,
      target: [50000, 40000, 0],
      width: 900,
      height: 700
    }
  });
  expect(out.id).toBe(SCALEBAR_VIEW_ID);
  expect(out.zoom).toBe(0);
  expect(out.target).toEqual([100, 50, 0]);
  expect(out.width).toBe(200);
  expect(out.height).toBe(100);
  expect(out).not.toHaveProperty('zoomX');
  expect(out).not.toHaveProperty('zoomY');
});

test('ScaleBarLayer keeps image view width/height for zoom math (not scale bar panel size)', () => {
  const view = new ScaleBarView({
    id: SCALEBAR_VIEW_ID,
    width: 160,
    height: 48,
    x: 0,
    y: 0,
    loader: [
      {
        meta: { physicalSizes: { x: { size: 1, unit: 'm' } } } }
    ],
    imageViewId: 'detail',
    position: 'bottom-right',
    length: 0.05,
    snap: false
  });
  const layers = view.getLayers({
    viewStates: {
      detail: {
        id: 'detail',
        target: [2000, 1500, 0],
        zoom: 2,
        width: 1920,
        height: 1080
      }
    }
  });
  expect(layers).toHaveLength(1);
  const layer = layers[0];
  expect(layer.props.width).toBe(160);
  expect(layer.props.height).toBe(48);
  expect(layer.props.imageViewState.width).toBe(1920);
  expect(layer.props.imageViewState.height).toBe(1080);
  expect(layer.props.imageViewState.zoom).toBe(2);
});
