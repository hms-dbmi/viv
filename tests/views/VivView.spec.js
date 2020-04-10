/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
import test from 'tape-catch';

import { VivView } from '../../src/views';
import { getVivId } from '../../src/views/utils';

export const defaultArguments = {
  initialViewState: {
    height: 5,
    width: 5,
    target: [1, 1, 0],
    zoom: -1,
    id: 'foo'
  },
  x: 2,
  y: 2
};

export function generateViewTests(ViewType, args) {
  test(`${ViewType.name} constructor test`, t => {
    const view = new ViewType(args);
    const { height, width, x, y } = view;
    t.equal(
      view.id,
      args.initialViewState.id,
      `${ViewType.name} constructor should destructure initialViewState for id`
    );
    t.ok(height, `${ViewType.name} should its height`);
    t.ok(width, `${ViewType.name} should its width`);
    t.ok(x, `${ViewType.name} should its x position`);
    t.ok(y, `${ViewType.name} should its y position`);
    t.end();
  });

  test(`${ViewType.name} DeckGLView test`, t => {
    const view = new ViewType(args);
    const deckGLView = view.getDeckGlView();
    const { height, width, x, y } = view;
    t.equal(
      deckGLView._height.position,
      height,
      'deckGLView should have same height as instance'
    );
    t.equal(
      deckGLView._width.position,
      width,
      'deckGLView should have same width as instance'
    );
    t.equal(
      deckGLView._y.position,
      y,
      'deckGLView should have same y as instance'
    );
    t.equal(
      deckGLView._x.position,
      x,
      'deckGLView should have same x as instance'
    );
    t.end();
  });

  test(`${ViewType.name} layer test`, t => {
    const view = new ViewType(args);
    const layer = view.getLayer({
      props: { loader: { type: 'loads' } },
      viewState: defaultArguments.initialViewState
    });
    layer &&
      t.ok(
        layer.id.includes(getVivId(view.id)),
        "Layer should include view's id as returned by getVivId"
      );
    t.end();
  });
}

generateViewTests(VivView, defaultArguments);
