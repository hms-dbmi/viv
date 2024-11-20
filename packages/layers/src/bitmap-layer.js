import { COORDINATE_SYSTEM, CompositeLayer } from '@deck.gl/core';
import { BitmapLayer as BaseBitmapLayer } from '@deck.gl/layers';
import { GL } from '@luma.gl/constants';
import { Model } from '@luma.gl/engine';
import { addAlpha } from './utils';

const PHOTOMETRIC_INTERPRETATIONS = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  TransparencyMask: 4,
  CMYK: 5,
  YCbCr: 6,
  CIELab: 8,
  ICCLab: 9
};

const defaultProps = {
  ...BaseBitmapLayer.defaultProps,
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
};

const getPhotometricInterpretationShader = (
  photometricInterpretation,
  transparentColorInHook
) => {
  const useTransparentColor = transparentColorInHook ? 'true' : 'false';
  const transparentColorVector = `vec3(${(transparentColorInHook || [0, 0, 0])
    .map(i => String(i / 255))
    .join(',')})`;
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return `color[3] = (${useTransparentColor} && (color.rgb == ${transparentColorVector})) ? 0.0 : color.a;`;
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return `\
          float value = 1.0 - (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return `\
          float value = (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      // We need to use an epsilon because the conversion to RGB is not perfect.
      return `\
          float y = color[0];
          float cb = color[1];
          float cr = color[2];
          color[0] = (y + (1.40200 * (cr - .5)));
          color[1] = (y - (0.34414 * (cb - .5)) - (0.71414 * (cr - .5)));
          color[2] = (y + (1.77200 * (cb - .5)));
          color[3] = (${useTransparentColor} && distance(color.rgb, ${transparentColorVector}) < 0.01) ? 0.0 : color.a;
        `;
    default:
      console.error(
        'Unsupported photometric interpretation or none provided.  No transformation will be done to image data'
      );
      return '';
  }
};

const getTransparentColor = photometricInterpretation => {
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return [255, 255, 255, 0];
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      return [16, 128, 128, 0];
    default:
      console.error(
        'Unsupported photometric interpretation or none provided.  No transformation will be done to image data'
      );
      return [0, 0, 0, 0];
  }
};

class BitmapLayerWrapper extends BaseBitmapLayer {
  _getModel(gl) {
    const { photometricInterpretation, transparentColorInHook } = this.props;
    // This is a port to the GPU of a subset of https://github.com/geotiffjs/geotiff.js/blob/master/src/rgb.js
    // Safari was too slow doing this off of the GPU and it is noticably faster on other browsers as well.
    const photometricInterpretationShader = getPhotometricInterpretationShader(
      photometricInterpretation,
      transparentColorInHook
    );
    return new Model(this.context.device, {
      ...this.getShaders(),
      id: this.props.id,
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      topology: 'triangle-list',
      isInstanced: false,
      inject: {
        'fs:DECKGL_FILTER_COLOR': photometricInterpretationShader
      }
    });
  }
}

/**
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {number=} photometricInterpretation One of WhiteIsZero BlackIsZero YCbCr or RGB (default)
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {String=} id Unique identifier for this layer.
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const BitmapLayer = class extends CompositeLayer {
  initializeState(args) {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    // This needs to be called here and not in the BitmapLayerWrapper because the `image` prop is converted to a texture outside of the layer, as controlled by the `image` type.
    // See: https://github.com/visgl/deck.gl/pull/5197
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    super.initializeState(args);
  }

  renderLayers() {
    const {
      photometricInterpretation,
      transparentColor: transparentColorInHook
    } = this.props;
    const transparentColor = getTransparentColor(photometricInterpretation);
    this.props.image.data = addAlpha(this.props.image.data);
    return new BitmapLayerWrapper(this.props, {
      // transparentColor is a prop applied to the original image data by deck.gl's
      // BitmapLayer and needs to be in the original colorspace.  It is used to determine
      // what color is "transparent" in the original color space (i.e what shows when opacity is 0).
      transparentColor,
      // This is our transparentColor props which needs to be applied in the hook that converts to the RGB space.
      transparentColorInHook,
      id: `${this.props.id}-wrapped`
    });
  }
};

BitmapLayer.layerName = 'BitmapLayer';
// From https://github.com/geotiffjs/geotiff.js/blob/8ef472f41b51d18074aece2300b6a8ad91a21ae1/src/globals.js#L202-L213
BitmapLayer.PHOTOMETRIC_INTERPRETATIONS = PHOTOMETRIC_INTERPRETATIONS;
BitmapLayer.defaultProps = {
  ...defaultProps,
  // We don't want this layer to bind the texture so the type should not be `image`.
  image: { type: 'object', value: {}, compare: true },
  transparentColor: { type: 'array', value: [0, 0, 0], compare: true },
  photometricInterpretation: { type: 'number', value: 2, compare: true }
};
BitmapLayerWrapper.defaultProps = defaultProps;
BitmapLayerWrapper.layerName = 'BitmapLayerWrapper';
export default BitmapLayer;
