import {BaseTileLayer} from '@deck.gl/layers';
import {Texture2D} from '@luma.gl/webgl'
import GL from '@luma.gl/constants';
import { COORDINATE_SYSTEM } from 'deck.gl';
import { XRLayer } from './XRLayer';
import {tileToBoundingBox} from './tiling-utils';
import {getTileIndices} from './tiling-utils';

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
    const { sliderValues } = props;
    const xrl = new XRLayer(props, {
      id: `XR-Layer-${west}-${south}-${east}-${north}`,
      pickable: false,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      rgbData: props.data,
      sliderValues,
      bounds: [west, south, east, north],
      visible: true,
    });
    return xrl;
  },
});

export class MicroscopyViewerLayer extends BaseTileLayer {

  constructor(props) {
    const layerProps = Object.assign({}, defaultProps, props, {
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
    })
    super(layerProps)
  }

}

MicroscopyViewerLayer.layerName = 'MicrsocopyViewerLayer';
MicroscopyViewerLayer.defaultProps = defaultProps;
