import { BitmapLayer } from '@deck.gl/layers';
import { Texture2D, Model, Geometry } from '@luma.gl/core';
import GL from '@luma.gl/constants';

import { PHOTOMETRIC_INTERPRETATIONS } from '../constants';

const DEFAULT_TEXTURE_PARAMETERS = {
  [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
  [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
  [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
  [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
};

export default class ArrayBitmapLayer extends BitmapLayer {
  _getModel(gl) {
    const {
      channelData: { photometricInterpretation }
    } = this.props;
    let photometricInterpretationShader;
    // This is a port to the GPU of a subset of https://github.com/geotiffjs/geotiff.js/blob/master/src/rgb.js
    // Safari was too slow doing this off of the GPU and it is noticably faster on other browsers as well.
    switch (photometricInterpretation) {
      case PHOTOMETRIC_INTERPRETATIONS.RGB:
        photometricInterpretationShader = '';
        break;
      case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
        photometricInterpretationShader = `\
          float value = 1.0 - (color.r / 256.0);
          color = vec4(value, value, value, color.a);
        `;
        break;
      case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
        photometricInterpretationShader = `\
          float value = (color.r / 256.0);
          color = vec4(value, value, value, color.a);
        `;
        break;
      case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
        photometricInterpretationShader = `\
          float y = color[0];
          float cb = color[1];
          float cr = color[2];
          color[0] = (y + (1.40200 * (cr - .5)));
          color[1] = (y - (0.34414 * (cb - .5)) - (0.71414 * (cr - .5)));
          color[2] = (y + (1.77200 * (cb - .5)));
        `;
        break;
      default:
        throw new Error('Unsupported photometric interpretation.');
    }
    if (!gl) {
      return null;
    }

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

  loadTexture() {
    const { gl } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    gl.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(GL.PACK_ALIGNMENT, 1);
    const { channelData } = this.props;
    if (channelData) {
      const {
        width,
        height,
        data: [data]
      } = channelData;
      this.setState({
        bitmapTexture: new Texture2D(gl, {
          width,
          height,
          data,
          format: GL.RGB,
          dataFormat: GL.RGB,
          type: GL.UNSIGNED_BYTE,
          mipmaps: false,
          parameters: {
            ...DEFAULT_TEXTURE_PARAMETERS
          }
        })
      });
    }
  }
}

ArrayBitmapLayer.layerName = 'ArrayBitmapLayer';
