import { BitmapLayer as BaseBitmapLayer } from '@deck.gl/layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { Model, Geometry } from '@luma.gl/core';
import GL from '@luma.gl/constants';

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
  pickable: true,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  bounds: { type: 'array', value: [0, 0, 1, 1], compare: true },
  opacity: { type: 'number', value: 1, compare: true }
};

const getPhotometricInterpretationShader = photometricInterpretation => {
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return '';
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return `\
          float value = 1.0 - (color.r / 256.0);
          color = vec4(value, value, value, color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return `\
          float value = (color.r / 256.0);
          color = vec4(value, value, value, color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      return `\
          float y = color[0];
          float cb = color[1];
          float cr = color[2];
          color[0] = (y + (1.40200 * (cr - .5)));
          color[1] = (y - (0.34414 * (cb - .5)) - (0.71414 * (cr - .5)));
          color[2] = (y + (1.77200 * (cb - .5)));
        `;
    default:
      console.error(
        'Unsupported photometric interpretation or none provided.  No transformation will be done to image data'
      );
      return '';
  }
};

export default class BitmapLayer extends BaseBitmapLayer {
  _getModel(gl) {
    const { photometricInterpretation } = this.props;
    // This is a port to the GPU of a subset of https://github.com/geotiffjs/geotiff.js/blob/master/src/rgb.js
    // Safari was too slow doing this off of the GPU and it is noticably faster on other browsers as well.
    const photometricInterpretationShader = getPhotometricInterpretationShader(
      photometricInterpretation
    );
    if (!gl) {
      return null;
    }
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    gl.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(GL.PACK_ALIGNMENT, 1);

    /*
      0,0 --- 1,0
       |       |
      0,1 --- 1,1
    */
    return new Model(gl, {
      ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: GL.TRIANGLES,
        vertexCount: 6
      }),
      isInstanced: false,
      inject: {
        'fs:DECKGL_FILTER_COLOR': photometricInterpretationShader
      }
    });
  }
}

BitmapLayer.layerName = 'BitmapLayer';
// From https://github.com/geotiffjs/geotiff.js/blob/8ef472f41b51d18074aece2300b6a8ad91a21ae1/src/globals.js#L202-L213
BitmapLayer.PHOTOMETRIC_INTERPRETATIONS = PHOTOMETRIC_INTERPRETATIONS;
BitmapLayer.defaultProps = defaultProps;
