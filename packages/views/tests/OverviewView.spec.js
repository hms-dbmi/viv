import { OverviewLayer } from '@vivjs/layers';
import { describe, expect, test } from 'vitest';
import { DETAIL_VIEW_ID, OVERVIEW_VIEW_ID, OverviewView } from '../src';
import {
  defaultArguments,
  defaultViewState,
  generateViewTests
} from './VivView.spec';

const id = OVERVIEW_VIEW_ID;
const loader = [
  { shape: [50000, 20000] },
  { shape: [25000, 10000] },
  { shape: [12500, 5000] },
  { shape: [6250, 2500] },
  { shape: [3125, 1250] },
  { shape: [1562, 625] }
];

const overviewViewArguments = {
  ...defaultArguments,
  id,
  loader,
  detailHeight: 1000,
  detailWidth: 500
};
const overviewViewState = {
  ...defaultViewState
};

const linkedViewIds = [DETAIL_VIEW_ID];

generateViewTests(OverviewView, overviewViewArguments, linkedViewIds);

test('OverviewView layer type check.', () => {
  const view = new OverviewView(overviewViewArguments);
  const viewState = view.filterViewState({ viewState: overviewViewState });
  const layers = view.getLayers({
    props: { loader },
    viewStates: {
      [id]: viewState,
      [DETAIL_VIEW_ID]: viewState
    }
  });
  expect(layers[0] instanceof OverviewLayer).toBeTruthy();
});

test('OverviewView respects maximumHeight and minimumHeight when height > width.', () => {
  const minimumHeight = 350;
  let view = new OverviewView({ ...overviewViewArguments, minimumHeight });
  expect(view.height).toBe(350);
  const maximumHeight = 5;
  view = new OverviewView({ ...overviewViewArguments, maximumHeight });
  expect(view.height).toBe(5);
});

test('OverviewView respects maximumWidth and minimumWidth when width > height.', () => {
  const minimumWidth = 350;
  const loaderWidth = [
    { type: 'loads', shape: [10000, 20000] },
    { type: 'loads', shape: [5000, 10000] },
    { type: 'loads', shape: [2500, 5000] }
  ];
  let view = new OverviewView({
    ...overviewViewArguments,
    loader: loaderWidth,
    minimumWidth
  });
  expect(view.width).toBe(350);
  const maximumWidth = 5;
  view = new OverviewView({
    ...overviewViewArguments,
    loader: loaderWidth,
    maximumWidth
  });
  expect(view.width).toBe(5);
});

test('OverviewView maintains fixed viewState regardless of detail view changes.', () => {
  const view = new OverviewView(overviewViewArguments);
  const viewState1 = view.filterViewState({ viewState: {} });
  const viewState2 = view.filterViewState({ viewState: {} });
  const { height, width, scale, _imageWidth, _imageHeight } = view;
  const expectedTarget = [
    (_imageWidth * scale) / 2,
    (_imageHeight * scale) / 2,
    0
  ];
  expect(viewState1.zoom).toBe(-(loader.length - 1));
  expect(viewState1.height).toBe(height);
  expect(viewState1.width).toBe(width);
  expect(viewState1.target).toEqual(expectedTarget);
  expect(viewState1.target).toEqual(viewState2.target);
});

test('filterViewState does not inherit zoomX/zoomY from the detail view', () => {
  const view = new OverviewView(overviewViewArguments);
  const out = view.filterViewState({
    viewState: {
      id: DETAIL_VIEW_ID,
      zoom: -2,
      zoomX: -2,
      zoomY: -2,
      target: [50000, 40000, 0],
      width: 900,
      height: 700
    }
  });
  expect(out.id).toBe(OVERVIEW_VIEW_ID);
  expect(out.zoom).toBe(-(loader.length - 1));
  expect(out).not.toHaveProperty('zoomX');
  expect(out).not.toHaveProperty('zoomY');
});
