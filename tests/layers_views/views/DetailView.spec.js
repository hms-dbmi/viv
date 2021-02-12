/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { DetailView, DETAIL_VIEW_ID } from '../../../src/views';
import { generateViewTests, defaultArguments } from './VivView.spec';
import { MultiscaleImageLayer, ScaleBarLayer } from '../../../src/layers';

const id = DETAIL_VIEW_ID;
const detailViewArguments = { ...defaultArguments };
detailViewArguments.initialViewState = { ...defaultArguments.initialViewState };
detailViewArguments.initialViewState.id = id;

generateViewTests(DetailView, detailViewArguments);

test(`DetailView layer type and props check`, t => {
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
  t.ok(
    layers[0] instanceof MultiscaleImageLayer,
    'DetailView layer should be MultiscaleImageLayer.'
  );
  t.ok(
    layers[1] instanceof ScaleBarLayer,
    'DetailView layer should be ScaleBarLayer.'
  );
  t.equal(
    layers[0].props.viewportId,
    view.id,
    'DetailView id should be passed down to layer as ViewportId.'
  );
  t.end();
});

test(`DetailView does not render scale bar without physical size`, t => {
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
  t.ok(
    layers[0] instanceof MultiscaleImageLayer,
    'DetailView layer should be MultiscaleImageLayer.'
  );
  t.ok(
    layers.length === 1,
    'DetailView layer should not display ScaleBarLayer in without physical size.'
  );
  t.end();
});
