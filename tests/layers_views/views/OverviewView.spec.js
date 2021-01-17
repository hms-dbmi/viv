/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import {
  OverviewView,
  DETAIL_VIEW_ID,
  OVERVIEW_VIEW_ID
} from '../../../src/views';
import {
  generateViewTests,
  defaultArguments,
  defaultViewState
} from './VivView.spec';
import { OverviewLayer } from '../../../src/layers';

const id = OVERVIEW_VIEW_ID;
const loader = {
  type: 'loads',
  numLevels: 7,
  getRasterSize: () => {
    return { height: 50000, width: 20000 };
  }
};
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

test(`OverviewView layer type check.`, t => {
  const view = new OverviewView(overviewViewArguments);
  const layers = view.getLayers({
    props: { loader },
    viewStates: {
      [id]: overviewViewState,
      [DETAIL_VIEW_ID]: overviewViewState
    }
  });
  t.ok(
    layers[0] instanceof OverviewLayer,
    'OverviewView layer should be OverviewLayer.'
  );
  t.end();
});

test(`OverviewView respects maximumHeight and minimumHeight when height > width.`, t => {
  const minimumHeight = 350;
  let view = new OverviewView({ ...overviewViewArguments, minimumHeight });
  t.equal(
    view.height,
    350,
    'OverviewView height should be minimumHeight when set and not calculated'
  );
  const maximumHeight = 5;
  view = new OverviewView({ ...overviewViewArguments, maximumHeight });
  t.equal(
    view.height,
    5,
    'OverviewView height should be maximumHeight when set and not calculated'
  );
  t.end();
});

test(`OverviewView respects maximumWidth and minimumWidth when width > height.`, t => {
  const minimumWidth = 350;
  const loaderWidth = {
    type: 'loads',
    numLevels: 7,
    getRasterSize: () => {
      return { height: 10000, width: 20000 };
    }
  };
  let view = new OverviewView({
    ...overviewViewArguments,
    loader: loaderWidth,
    minimumWidth
  });
  t.equal(
    view.width,
    350,
    'OverviewView width should be minimumWidth when set and not calculated'
  );
  const maximumWidth = 5;
  view = new OverviewView({
    ...overviewViewArguments,
    loader: loaderWidth,
    maximumWidth
  });
  t.equal(
    view.width,
    5,
    'OverviewView width should be maximumWidth when set and not calculated'
  );
  t.end();
});

test(`OverviewView maintains viewState.`, t => {
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
  const { numLevels } = loader;
  t.equal(
    viewState1.zoom,
    -(numLevels - 1),
    'Zoom level is the number of levels of the image pyramid minus one.'
  );
  t.equal(
    viewState1.height,
    height,
    'Height is the same as the initialized value.'
  );
  t.equal(
    viewState1.width,
    width,
    'Width is the same as the initialized value.'
  );
  t.deepEqual(
    viewState1.target,
    viewState2.target,
    'Target is constant over multiple calls'
  );
  t.end();
});
