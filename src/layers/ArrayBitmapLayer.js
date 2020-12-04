import { BitmapLayer } from '@deck.gl/layers';
import { Texture2D } from '@luma.gl/core';
import GL from '@luma.gl/constants';

const DEFAULT_TEXTURE_PARAMETERS = {
  [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
  [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
  [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
  [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
};

export default class ArrayBitmapLayer extends BitmapLayer {
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
