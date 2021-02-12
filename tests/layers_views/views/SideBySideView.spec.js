/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { PolygonLayer } from '@deck.gl/layers';

import { SideBySideView } from '../../../src/views';
import { generateViewTests, defaultArguments } from './VivView.spec';
import {
  MultiscaleImageLayer,
  ImageLayer,
  ScaleBarLayer
} from '../../../src/layers';

generateViewTests(SideBySideView, defaultArguments);

test(`SideBySideView layer type and props check`, t => {
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
  t.ok(
    layers[0] instanceof ImageLayer,
    'SideBySideView layer should be MultiscaleImageLayer.'
  );
  t.ok(
    layers[1] instanceof PolygonLayer,
    'SideBySideView layer should be PolygonLayer.'
  );
  t.ok(
    layers[2] instanceof ScaleBarLayer,
    'DetailView layer should be ScaleBarLayer.'
  );
  t.equal(
    layers[0].props.viewportId,
    view.id,
    'SideBySideView id should be passed down to layer as ViewportId.'
  );
  t.end();
});

test(`SideBySideView layer with multiscale`, t => {
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
  t.ok(
    layers[0] instanceof MultiscaleImageLayer,
    'SideBySideView layer should be MultiscaleImageLayer.'
  );
  t.ok(
    layers[1] instanceof PolygonLayer,
    'SideBySideView layer should be PolygonLayer.'
  );
  t.ok(
    layers[2] instanceof ScaleBarLayer,
    'DetailView layer should be ScaleBarLayer.'
  );
  t.equal(
    layers[0].props.viewportId,
    view.id,
    'SideBySideView id should be passed down to layer as ViewportId.'
  );
  t.end();
});

test(`SideBySideView layer does not render scale bar without physical size`, t => {
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
  t.ok(
    layers[0] instanceof MultiscaleImageLayer,
    'SideBySideView layer should be MultiscaleImageLayer.'
  );
  t.ok(
    layers[1] instanceof PolygonLayer,
    'SideBySideView layer should be PolygonLayer.'
  );
  t.ok(
    layers.length === 2,
    'SideBySideView should not have more than PolygonLayer and MultiscaleImageLayer'
  );
  t.end();
});

const generateZoomLockTest = (panLock, zoomLock) => {
  test(`SideBySideView ${panLock ? 'with' : 'without'} pan and ${
    zoomLock ? 'with' : 'without'
  } zoom lock.`, t => {
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
    t.equal(
      newViewState.target[0],
      panLock ? dx : 0,
      'X coordinated should update.'
    );
    t.equal(
      newViewState.target[1],
      panLock ? dy : 0,
      'Y coordinated should update.'
    );
    t.equal(newViewState.zoom, zoomLock ? dZoom : 0, 'Zoom should update.');
    t.end();
  });
};

// We test all combinations.
generateZoomLockTest(true, false);
generateZoomLockTest(false, false);
generateZoomLockTest(true, true);
generateZoomLockTest(false, true);
