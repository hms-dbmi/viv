import { CompositeLayer, COORDINATE_SYSTEM } from '@deck.gl/core';
import GL from '@luma.gl/constants';
import { TextLayer } from '@deck.gl/layers';
import { Matrix4 } from 'math.gl';
import XR3DLayer from '../XR3DLayer';
import { getPhysicalSizeScalingMatrix } from '../utils';
import { RENDERING_MODES } from '../../constants';
import { getVolume } from './utils';

const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  colormap: { type: 'string', value: '', compare: true },
  loaderSelection: { type: 'array', value: [], compare: true },
  resolution: { type: 'number', value: 0, compare: true },
  domain: { type: 'array', value: [], compare: true },
  loader: {
    type: 'object',
    value: [
      {
        getRaster: async () => ({ data: [], height: 0, width: 0 }),
        dtype: 'Uint16',
        shape: [1],
        labels: ['z']
      }
    ],
    compare: true
  },
  xSlice: { type: 'array', value: null, compare: true },
  ySlice: { type: 'array', value: null, compare: true },
  zSlice: { type: 'array', value: null, compare: true },
  clippingPlanes: { type: 'array', value: [], compare: true },
  renderingMode: {
    type: 'string',
    value: RENDERING_MODES.MAX_INTENSITY_PROJECTION,
    compare: true
  },
  onUpdate: { type: 'function', value: () => {}, compare: true },
  useProgressIndicator: { type: 'boolean', value: true, compare: true }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} sliderValues List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<Array.<number>>} colorValues List of [r, g, b] values for each channel.
 * @property {Array.<boolean>} channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Represents an N-dimensional image.
 * @property {Array} loaderSelection Selection to be used for fetching data.
 * @property {string=} colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {number=} resolution Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length -1 the lowest default 0)
 * @property {string=} renderingMode One of Maximum Intensity Projection, Minimum Intensity Projection, or Additive
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {boolean=} useProgressIndicator Whether or not to use the default progress text + indicator (default is true)
 * @property {function=} onUpdate A callback to be used for getting updates of the progress, ({ progress }) => {}
 */

/**
 * @type {{ new <S extends string[]>(...props: import('../../types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const VolumeLayer = class extends CompositeLayer {
  finalizeState() {
    this.state.abortController.abort();
  }

  updateState({ changeFlags, oldProps, props }) {
    const { propsChanged } = changeFlags;
    const loaderChanged =
      typeof propsChanged === 'string' && propsChanged.includes('props.loader');
    const resolutionChanged =
      typeof propsChanged === 'string' &&
      propsChanged.includes('props.resolution');
    const loaderSelectionChanged =
      props.loaderSelection !== oldProps.loaderSelection;
    // Only fetch new data to render if loader has changed
    if (loaderChanged || loaderSelectionChanged || resolutionChanged) {
      const {
        loader,
        loaderSelection = [],
        resolution,
        onViewportLoad
      } = this.props;
      const source = loader[resolution];
      let progress = 0;
      const totalRequests =
        // eslint-disable-next-line no-bitwise
        (source.shape[source.labels.indexOf('z')] >> resolution) *
        loaderSelection.length;
      const onUpdate = () => {
        progress += 0.5 / totalRequests;
        if (this.props.onUpdate) {
          this.props.onUpdate({ progress });
        }
        this.setState({ progress });
      };
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const volumePromises = loaderSelection.map(selection =>
        getVolume({
          selection,
          source,
          onUpdate,
          downsampleDepth: 2 ** resolution,
          signal
        })
      );
      const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(
        loader[resolution]
      );

      Promise.all(volumePromises).then(volumes => {
        if (onViewportLoad) {
          onViewportLoad(volumes);
        }
        const volume = {
          data: volumes.map(d => d.data),
          width: volumes[0].width,
          height: volumes[0].height,
          depth: volumes[0].depth
        };

        this.setState({
          ...volume,
          physicalSizeScalingMatrix,
          resolutionMatrix: new Matrix4().scale(2 ** resolution)
        });
      });
    }
  }

  renderLayers() {
    const { loader, id, resolution, useProgressIndicator } = this.props;
    const { dtype } = loader[resolution];
    const {
      data,
      width,
      height,
      depth,
      progress,
      physicalSizeScalingMatrix,
      resolutionMatrix
    } = this.state;
    if (!(width && height) && useProgressIndicator) {
      const { viewport } = this.context;
      return new TextLayer({
        id: `loading-text-layer-${id}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: [
          {
            text: `Loading Volume ${String((progress || 0) * 100).slice(
              0,
              5
            )}%...`,
            position: viewport.position
          }
        ],
        getColor: [220, 220, 220, 255],
        getSize: 25,
        sizeUnits: 'meters',
        sizeScale: 2 ** -viewport.zoom,
        fontFamily: 'Helvetica'
      });
    }
    return new XR3DLayer(this.props, {
      channelData: { data, width, height, depth },
      id: `XR3DLayer-${0}-${height}-${width}-${0}-${resolution}-${id}`,
      physicalSizeScalingMatrix,
      parameters: {
        [GL.CULL_FACE]: true,
        [GL.CULL_FACE_MODE]: GL.FRONT,
        [GL.DEPTH_TEST]: false,
        blendFunc: [GL.SRC_ALPHA, GL.ONE],
        blend: true
      },
      resolutionMatrix,
      dtype
    });
  }
};

VolumeLayer.layerName = 'VolumeLayer';
VolumeLayer.defaultProps = defaultProps;
export default VolumeLayer;
