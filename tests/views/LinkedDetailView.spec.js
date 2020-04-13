/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { PolygonLayer } from '@deck.gl/layers';

import { LinkedDetailView } from '../../src/views';
import { generateViewTests, defaultArguments } from './VivView.spec';
import { VivViewerLayer } from '../../src/layers';

generateViewTests(LinkedDetailView, defaultArguments);

test(`LinkedDetailView layer type and props check`, t => {
  const view = new LinkedDetailView(defaultArguments);
  const loader = { type: 'loads', isPyramid: true };
  const layers = view.getLayers({
    props: { loader },
    viewStates: {
      foo: defaultArguments.initialViewState
    }
  });
  t.ok(
    layers[0] instanceof VivViewerLayer,
    'LinkedDetailView layer should be VivViewerLayer.'
  );
  t.ok(
    layers[1] instanceof PolygonLayer,
    'LinkedDetailView layer should be VivViewerLayer.'
  );
  t.equal(
    layers[0].props.viewportId,
    view.id,
    'LinkedDetailView id should be passed down to layer as ViewportId.'
  );
  t.end();
});

const generateZoomLockTest = (panLock, zoomLock) => {
  test(`LinkedDetailView ${panLock ? 'with' : 'without'} pan and ${
    zoomLock ? 'with' : 'without'
  } zoom lock.`, t => {
    const linkedId = 'bar';
    const view = new LinkedDetailView({
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
