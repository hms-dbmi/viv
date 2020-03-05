import { TileLayer } from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

import { loadZarr, loadTiff } from './data-utils';
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
  connections: { type: 'object', value: {}, compare: true },
  pool: { type: 'object', value: {}, compare: false },
  renderSubLayers: { type: 'function', value: renderSubLayers, compare: false },
  useZarr: { type: 'boolean', value: false, compare: true },
  useTiff: { type: 'boolean', value: false, compare: true }
};

export default class VivViewerLayerBase extends TileLayer {
  async getTileData({ x, y, z }) {
    const { useZarr, useTiff } = this.props;
    const tileLoadProps = {
      x,
      y,
      z: -z,
      ...this.props
    };
    if (isInTileBounds(tileLoadProps)) {
      if (useTiff) {
        const tile = loadTiff(tileLoadProps);
        return tile;
      }
      if (useZarr) {
        const tile = loadZarr(tileLoadProps);
        return tile;
      }
      // If neither zarr or tiff is indicated, use whatever is passed in.
      const tile = this.props.getTileData({ x, y, z });
      return tile;
    }
    return null;
  }
}

VivViewerLayerBase.layerName = 'VivViewerLayerBase';
VivViewerLayerBase.defaultProps = defaultProps;
