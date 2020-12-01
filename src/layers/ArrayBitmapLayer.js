import { BitmapLayer } from '@deck.gl/layers';
import { Texture2D } from '@luma.gl/core';
import GL from '@luma.gl/constants';

const DEFAULT_TEXTURE_PARAMETERS = {
  [GL.TEXTURE_MIN_FILTER]: GL.LINEAR_MIPMAP_LINEAR,
  [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
  [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
  [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
};

export default class ArrayBitmapLayer extends BitmapLayer {
  loadTexture() {
    const { gl } = this.context;
    const { channelData } = this.props;
    if (channelData) {
      const {
        width,
        height,
        data: [data]
      } = channelData;
      // Browser object: Image, ImageData, HTMLCanvasElement, ImageBitmap
      this.setState({
        bitmapTexture: new Texture2D(gl, {
          width,
          height,
          data,
          format: GL.RGB,
          dataFormat: GL.RGB,
          type: GL.UNSIGNED_BYTE,
          parameters: {
            ...DEFAULT_TEXTURE_PARAMETERS
          }
        })
      });
    }
  }
}

ArrayBitmapLayer.layerName = 'ArrayBitmapLayer';
