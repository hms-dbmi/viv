import {BaseTileLayer} from '@deck.gl/layers';
import {Texture2D} from '@luma.gl/webgl'
import GL from '@luma.gl/constants';
import { COORDINATE_SYSTEM } from 'deck.gl';
import { XRLayer } from '../xr-layer';
import {tileToBoundingBox} from './tiling-utils';
import {getTileIndices} from './tiling-utils';
import { loadZarr, loadTiff } from './data-utils';

const defaultProps = Object.assign({}, BaseTileLayer.defaultProps, {
  id: `microscopy-tile-layer`,
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  maxZoom: 0,
  onViewportLoad: false,
  renderSubLayers: (props) => {
    const {
      bbox: {
        west, south, east, north,
      },
    } = props.tile;
    const { sliderValues, data, colorValues } = props;
    const xrl = new XRLayer(props, {
      id: `XR-Layer-${west}-${south}-${east}-${north}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      rgbData: data,
      sliderValues,
      colorValues,
      bounds: [west, south, east, north],
      visible: true,
    });
    return xrl;
  },
});

export class MicroscopyViewerLayerBase extends BaseTileLayer {

  constructor(props) {
    const minZoom = Math.floor(-1 * Math.log2(Math.max(props.imageHeight, props.imageWidth)));
    const {sliderValues, colorValues} = props
    var orderedSliderValues = []
    var orderedColorValues = []
    Object.keys(sliderValues).sort().forEach(function(key) {
      orderedSliderValues.push(sliderValues[key]);
    })
    Object.keys(colorValues).sort().forEach(function(key) {
      orderedColorValues.push(colorValues[key]);
    })
    var diff = 6 - orderedSliderValues.length
    for (var i = 0; i < diff; i++) {
      orderedSliderValues.push([0,65535]);
    }
    var diff = 6 - orderedColorValues.length
    for (var j = 0; j < diff; j++) {
      orderedColorValues.push([0,0,0]);
    }
    orderedColorValues = orderedColorValues.map(color => color.map(ch => ch / 255))
    // flatten for use on shaders
    var flatSliderValues = [].concat.apply([], orderedSliderValues)
    const getZarr = ({ x, y, z }) => {
      return loadZarr({
        x, y, z: -1 * z, ...props,
      });
    }
    const getTiff = ({ x, y, z }) => {
      return loadTiff({
        x, y, z: -1 * z, ...props,
      });
    }
    const getTileData = (props.useZarr && getZarr) ||
                        (props.useTiff && getTiff) ||
                        props.getTileData
    const overrideValuesProps = Object.assign(
      {}, props, {
        sliderValues: flatSliderValues,
        colorValues: orderedColorValues,
        minZoom,
        getTileData,
        getTileIndices: (viewport, maxZoom, minZoom) => {
          return getTileIndices({
            viewport, maxZoom, minZoom, ...props,
          });
        },
        tileToBoundingBox: (x, y, z) => {
          return tileToBoundingBox({
            x, y, z, ...props,
          });
        },
      }
    )
    const layerProps = Object.assign({}, defaultProps, overrideValuesProps)
    super(layerProps)
  }

}

MicroscopyViewerLayerBase.layerName = 'MicroscopyViewerLayerBase';
MicroscopyViewerLayerBase.defaultProps = defaultProps;
