import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

const RENDERING_MODES_COLORMAP = {
  [RENDERING_NAMES.MAX_INTENSITY_PROJECTION]: {
    _BEFORE_RENDER: `\
      float maxVals[6] = float[6](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
    `,
    _RENDER: `\
    
      float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

      for(int i = 0; i < 6; i++) {
        if(intensityArray[i] > maxVals[i]) {
          maxVals[i] = intensityArray[i];
        }
      }
    `,
    _AFTER_RENDER: `\
      float total = 0.0;
      for(int i = 0; i < 6; i++) {
        total += maxVals[i];
      }
      // Do not go past 1 in opacity/colormap value.
      total = min(total, 1.0);
      color = colormap(total, total);
    `
  },
  [RENDERING_NAMES.MIN_INTENSITY_PROJECTION]: {
    _BEFORE_RENDER: `\
      float minVals[6] = float[6](1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0.);
    `,
    _RENDER: `\
    
      float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

      for(int i = 0; i < 6; i++) {
        if(intensityArray[i] < minVals[i]) {
          minVals[i] = intensityArray[i];
        }
      }
    `,
    _AFTER_RENDER: `\
      float total = 0.0;
      for(int i = 0; i < 6; i++) {
        total += minVals[i];
      }
      // Do not go past 1 in opacity/colormap value.
      total = min(total, 1.0);
      color = colormap(total, total);
    `
  },
  [RENDERING_NAMES.ADDITIVE]: {
    _BEFORE_RENDER: ``,
    _RENDER: `\
    float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
		float total = 0.0;

		for(int i = 0; i < 6; i++) {
			total += intensityArray[i];
		}
		// Do not go past 1 in opacity/colormap value.
		total = min(total, 1.0);

		vec4 val_color = colormap(total, total);

		// Opacity correction
		val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
		color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
		color.a += (1.0 - color.a) * val_color.a;
		if (color.a >= 0.95) {
			break;
		}
    p += ray_dir * dt;
    `,
    _AFTER_RENDER: ``
  }
};

export default RENDERING_MODES_COLORMAP;
