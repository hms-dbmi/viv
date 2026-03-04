import { ScaleBarLayer } from '@vivjs/layers';
import { expect, test } from 'vitest';
import { SCALEBAR_VIEW_ID, ScaleBarView } from '../src';
import { defaultArguments, generateViewTests } from './VivView.spec';

const id = SCALEBAR_VIEW_ID;
const loader = [
  {
    meta: { physicalSizes: { x: { size: 10, unit: 'nm' } } },
    imageViewId: 'detail'
  }
];
const scalebarViewArgs = { ...defaultArguments, loader };
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
