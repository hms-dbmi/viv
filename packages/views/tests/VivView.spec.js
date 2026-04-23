import { expect, test } from 'vitest';

import { VivView } from '../src';
import { getVivId } from '../src/utils';

export const defaultArguments = {
  id: 'foo',
  x: 100,
  y: 50,
  height: 500,
  width: 1000
};

export const defaultViewState = {
  target: [5000, 5000, 0],
  zoom: -4
};

export function generateViewTests(ViewType, args, linkedViewIds = []) {
  test(`${ViewType.name} constructor test`, () => {
    const view = new ViewType(args);
    const { id, height, width, x, y } = view;
    expect(id).toBeTruthy();
    expect(height).toBeTruthy();
    expect(width).toBeTruthy();
    expect(x).toBeTruthy();
    expect(y).toBeTruthy();
  });

  test(`${ViewType.name} DeckGLView test`, () => {
    const view = new ViewType(args);
    const deckGLView = view.getDeckGlView();
    const { height, width, x, y } = view;
    // Note: previous tests were based on deck.gl internal deckGLView._height.position etc,
    // which has changed.
    const dimensions = deckGLView.getDimensions({
      width: x + width + 100,
      height: y + height + 100
    });
    expect(dimensions.height).toBe(height);
    expect(dimensions.width).toBe(width);
    expect(dimensions.y).toBe(y);
    expect(dimensions.x).toBe(x);
  });

  test(`${ViewType.name} layer test`, () => {
    const view = new ViewType(args);
    const viewStates = { [view.id]: defaultViewState };
    linkedViewIds.forEach(id => {
      // endow linked views with some properties
      viewStates[id] = view.filterViewState(defaultViewState);
    });
    const layers = view.getLayers({
      props: {
        loader: [{ type: 'loads' }],
        selections: [{ foo: 'bar' }],
        transitionFields: ['foo']
      },
      viewStates
    });
    layers?.forEach(layer => {
      layer && expect(layer.id.includes(getVivId(view.id))).toBeTruthy();
    });
  });
}

generateViewTests(VivView, defaultArguments);
