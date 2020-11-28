/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';

import { VivView } from '../../../src/views';
import { getVivId } from '../../../src/views/utils';

export const defaultArguments = {
  initialViewState: {
    target: [5000, 5000, 0],
    zoom: -4,
    id: 'foo'
  },
  x: 100,
  y: 50,
  height: 500,
  width: 1000
};

export function generateViewTests(ViewType, args, linkedViewIds = []) {
  test(`${ViewType.name} constructor test`, t => {
    const view = new ViewType(args);
    const { height, width, x, y } = view;
    t.equal(
      view.id,
      args.initialViewState.id,
      `${ViewType.name} constructor should destructure initialViewState for id.`
    );
    t.ok(height, `${ViewType.name} should have its height.`);
    t.ok(width, `${ViewType.name} should  haveits width.`);
    t.ok(x, `${ViewType.name} should have its x position.`);
    t.ok(y, `${ViewType.name} should have its y position.`);
    t.end();
  });

  test(`${ViewType.name} DeckGLView test`, t => {
    const view = new ViewType(args);
    const deckGLView = view.getDeckGlView();
    const { height, width, x, y } = view;
    t.equal(
      deckGLView._height.position,
      height,
      'deckGLView should have same height as instance.'
    );
    t.equal(
      deckGLView._width.position,
      width,
      'deckGLView should have same width as instance.'
    );
    t.equal(
      deckGLView._y.position,
      y,
      'deckGLView should have same y as instance.'
    );
    t.equal(
      deckGLView._x.position,
      x,
      'deckGLView should have same x as instance.'
    );
    t.end();
  });

  test(`${ViewType.name} layer test`, t => {
    const view = new ViewType(args);
    const viewStates = { [view.id]: defaultArguments.initialViewState };
    linkedViewIds.forEach(id => {
      // endow linked views with some properties
      viewStates[id] = defaultArguments.initialViewState;
    });
    const layers = view.getLayers({
      props: { loader: { type: 'loads', isPyramid: true } },
      viewStates
    });
    layers &&
      layers.forEach(layer => {
        layer &&
          t.ok(
            layer.id.includes(getVivId(view.id)),
            "Layer should include view's id as returned by getVivId."
          );
      });
    t.end();
  });
}

generateViewTests(VivView, defaultArguments);
