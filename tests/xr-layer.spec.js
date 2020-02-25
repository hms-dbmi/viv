import test from 'tape-catch';

import { testLayer } from '@deck.gl/test-utils';
import { XRLayer } from '../src/layers/xr-layer';

test('XRLayer#constructor', t => {
  const positions = new Float32Array([2, 4, 0, 2, 8, 0, 16, 8, 0, 16, 4, 0]);
  const data = new Uint16Array([20000, 10000, 10000, 10000]);
  const tileSize = 2;
  testLayer({
    Layer: XRLayer,
    onError: t.notOk,
    testCases: [
      {
        title: 'Init layer',
        props: { id: 'init' }
      },
      {
        updateProps: {
          bounds: [2, 4, 16, 8],
          sliderValues: [0, 10],
          colorValues: [0, 1, 1],
          tileSize,
          data: new Array([data])
        },
        onAfterUpdate({ layer, oldState }) {
          t.ok(layer.state, 'should update layer state');
          t.deepEqual(
            layer.getAttributeManager().attributes.positions.value,
            positions,
            'should update positions'
          );
          t.deepEqual(
            layer.state.textures.channel0.data,
            data,
            'should update positions'
          );
        }
      }
    ]
  });

  t.end();
});
