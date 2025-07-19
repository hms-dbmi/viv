import { OverviewLayer } from '@vivjs/layers';
import { test, expect, describe } from 'vitest';
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

test('OverviewView maintains viewState.', () => {
  const view = new OverviewView(overviewViewArguments);
  const viewState1 = view.filterViewState({
    height: 10,
    width: 10,
    target: [0, 0, 0],
    zoom: 0
  });
  const viewState2 = view.filterViewState({
    height: 15,
    width: 20,
    target: [0, 0, 0],
    zoom: 0
  });
  const { height, width } = view;
  expect(viewState1.zoom).toBe(-(loader.length - 1));
  expect(viewState1.height).toBe(height);
  expect(viewState1.width).toBe(width);
  expect(viewState1.target).toEqual(viewState2.target);
});
