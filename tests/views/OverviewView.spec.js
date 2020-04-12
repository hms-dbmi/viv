/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { OverviewView } from '../../src/views';
import { generateViewTests, defaultArguments } from './VivView.spec';
import { OverviewLayer } from '../../src/layers';

const id = 'overview';
const loader = {
  type: 'loads',
  numLevels: 7,
  getRasterSize: () => {
    return { height: 50000, width: 20000 };
  }
};
const overviewViewArguments = {
  ...defaultArguments,
  loader,
  detailHeight: 1000,
  detailWidth: 500
};
overviewViewArguments.initialViewState.id = id;
const linkedViewIds = ['detail'];

generateViewTests(OverviewView, overviewViewArguments, linkedViewIds);

test(`OverviewView layer type check.`, t => {
  const view = new OverviewView(overviewViewArguments);
  const layer = view.getLayer({
    props: { loader },
    viewStates: {
      [id]: overviewViewArguments.initialViewState,
      detail: overviewViewArguments.initialViewState
    }
  });
  t.ok(
    layer instanceof OverviewLayer,
    'OverviewView layer should be OverviewLayer.'
  );
  t.end();
});

test(`OverviewView respects minimumWidth and maximumWidth.`, t => {
  const minimumWidth = 350;
  let view = new OverviewView({ ...overviewViewArguments, minimumWidth });
  t.equal(
    view.width,
    350,
    'OverviewView width should be minimumWidth when set and not calculated'
  );
  const maximumWidth = 5;
  view = new OverviewView({ ...overviewViewArguments, maximumWidth });
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
