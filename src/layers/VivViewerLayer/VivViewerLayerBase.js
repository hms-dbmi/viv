import { TileLayer } from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { isInTileBounds, renderSubLayers } from './utils';

const defaultProps = {
  ...TileLayer.defaultProps,
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  tileSize: { type: 'number', value: 512, compare: true },
  imageHeight: { type: 'number', value: 1028, compare: true },
  imageWidth: { type: 'number', value: 1028, compare: true },
  minZoom: { type: 'number', value: 0, compare: true },
  maxZoom: { type: 'number', value: 0, compare: true },
  renderSubLayers: { type: 'function', value: renderSubLayers, compare: false }
};

export default class VivViewerLayerBase extends TileLayer {}

VivViewerLayerBase.layerName = 'VivViewerLayerBase';
VivViewerLayerBase.defaultProps = defaultProps;
