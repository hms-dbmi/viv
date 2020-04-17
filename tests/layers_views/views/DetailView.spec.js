/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';
import { DetailView } from '../../../src/views';
import { generateViewTests, defaultArguments } from './VivView.spec';
import { VivViewerLayer } from '../../../src/layers';

const id = 'detail';
const detailViewArguments = { ...defaultArguments };
detailViewArguments.initialViewState = { ...defaultArguments.initialViewState };
detailViewArguments.initialViewState.id = id;

generateViewTests(DetailView, detailViewArguments);

test(`DetailView layer type and props check`, t => {
  const view = new DetailView(detailViewArguments);
  const loader = { type: 'loads', isPyramid: true };
  const layers = view.getLayers({ props: { loader } });
  t.ok(
    layers[0] instanceof VivViewerLayer,
    'DetailView layer should be VivViewerLayer.'
  );
  t.equal(
    layers[0].props.viewportId,
    view.id,
    'DetailView id should be passed down to layer as ViewportId.'
  );
  t.end();
});
