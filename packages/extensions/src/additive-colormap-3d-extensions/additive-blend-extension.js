import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
import BaseExtension from './base-extension';

const _BEFORE_RENDER = `\
/////// additive-colormap-3d before render
  float intensityValue${I} = 0.0;
`;

const _RENDER = `\
/////// additive-colormap-3d render
  float total = 0.0;

  // this will create an unrolled accumulation over all channels
  total += intensityValue${I};
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
`;

const _AFTER_RENDER = '';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Additive Blending in 3D.
 * */
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

export default AdditiveBlendExtension;
