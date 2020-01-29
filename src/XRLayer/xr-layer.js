import GL from '@luma.gl/constants';
import { Layer, project32 } from '@deck.gl/core';
import { Model, Geometry, Texture2D } from '@luma.gl/core';
import vs from './xr-layer-vertex';
import fs from './xr-layer-fragment';

const defaultProps = {
  rgbData: null,
}

export class XRLayer extends Layer {
  getShaders() {
    return super.getShaders({ vs, fs, modules: [project32] });
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();

    attributeManager.add({
      positions: {
        size: 3,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        update: this.calculatePositions,
        noAlloc: true,
      },
    });

    this.setState({
      numInstances: 1,
      positions: new Float64Array(12),
    });

    attributeManager.remove('instancePickingColors');
  }

  finalizeState() {
    super.finalizeState();

    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex && tex.delete());
    }
  }

  updateState({ props, oldProps, changeFlags }) {
    // setup model first
    if (changeFlags.extensionsChanged) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({ model: this._getModel(gl) });
      this.getAttributeManager().invalidateAll();
    }
    if (changeFlags.dataChanged) {
      this.loadTexture(props.rgbData);
    }

    const attributeManager = this.getAttributeManager();

    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate('positions');
    }
  }

  _getModel(gl) {
    if (!gl) {
      return null;
    }

    /*
       0,0 --- 1,0
        |       |
       0,1 --- 1,1
     */
    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_FAN,
          vertexCount: 4,
          attributes: {
            texCoords: new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]),
          },
        }),
        isInstanced: false,
      }),
    );
  }

  calculatePositions(attributes) {
    const { positions } = this.state;
    const { bounds } = this.props;
    // bounds as [minX, minY, maxX, maxY]
    /*
      (minX0, maxY3) ---- (maxX2, maxY3)
             |                  |
             |                  |
             |                  |
      (minX0, minY1) ---- (maxX2, minY1)
   */
    positions[0] = bounds[0];
    positions[1] = bounds[1];
    positions[2] = 0;

    positions[3] = bounds[0];
    positions[4] = bounds[3];
    positions[5] = 0;

    positions[6] = bounds[2];
    positions[7] = bounds[3];
    positions[8] = 0;

    positions[9] = bounds[2];
    positions[10] = bounds[1];
    positions[11] = 0;

    attributes.value = positions;
  }

  draw({ uniforms }) {
    const { textures, model } = this.state;
    if (textures && model) {
      var sliderValues = this.props.sliderValues;
      var colorValues  = this.props.colorValues;
      model
        .setUniforms(
          Object.assign({}, uniforms, {
            colorValue0:colorValues[0],
            colorValue1:colorValues[1],
            colorValue2:colorValues[2],
            colorValue3:colorValues[3],
            colorValue4:colorValues[4],
            colorValue5:colorValues[5],
            sliderValues,
            ...textures
          }),
        )
        .draw();
    }
  }

  loadTexture(data) {
    var textures = {
      channel0: null,
      channel2: null,
      channel3: null,
      channel4: null,
      channel5: null,
    }
    if(this.state.textures) {
      Object.values(this.state.textures).forEach(tex => tex && tex.delete());
    }
    if (data instanceof Promise) {
      data.then((dataResolved) => {
        dataResolved.forEach((d, i) => textures[`channel${i}`] = this.dataToTexture(d))
      }).then(() =>
        this.setState({ textures: textures })
      );
    }
    else if (data instanceof Object) {
      data.forEach((d, i) => textures[`channel${i}`] = this.dataToTexture(d))
      this.setState({ textures: textures });
    }
  }

  dataToTexture(data) {
    // eslint-disable-next-line no-nested-ternary
    const isInt8 = data instanceof Uint8Array;
    const isInt16 = data instanceof Uint16Array;
    const isInt32 = data instanceof Uint32Array;
    const formats = {
    format: (isInt8 && GL.R8UI)
         || (isInt16 && GL.R16UI)
         || (isInt32 && GL.R32UI),
    dataFormat: GL.RED_INTEGER,
    type: (isInt8 && GL.UNSIGNED_BYTE)
          || (isInt16 && GL.UNSIGNED_SHORT)
          || (isInt32 && GL.UNSIGNED_INT),
    };
    const texture = new Texture2D(this.context.gl, {
      width: this.props.tileSize,
      height: this.props.tileSize,
      data,
      // we don't want or need mimaps
      mipmaps: false,
      parameters: {
        // NEAREST for integer data
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
      },
      ...formats,
    });
    return texture;
  }
}

XRLayer.layerName = 'XRLayer';
XRLayer.defaultProps = defaultProps;
