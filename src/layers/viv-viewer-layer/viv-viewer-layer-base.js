import { TileLayer } from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

import { loadZarr, loadTiff } from './data-utils';
import { inTileBounds, renderSubLayers } from './utils';

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
  pool: { type: 'object', value: {}, compare: true },
  renderSubLayers: { type: 'function', value: renderSubLayers, compare: false },
  useZarr: { type: 'boolean', value: false, compare: true },
  useTiff: { type: 'boolean', value: false, compare: true }
};

export class VivViewerLayerBase extends TileLayer {
  async getTileData({ x, y, z }) {
    const { useZarr, useTiff } = this.props;
    if (
      inTileBounds({
        x,
        y,
        z: -z,
        ...this.props
      })
    ) {
      if (useTiff) {
        const tile = loadTiff({
          x,
          y,
          z: -1 * z,
          ...this.props
        });
        return tile;
      }
      if (useZarr) {
        const tile = loadZarr({
          x,
          y,
          z: -1 * z,
          ...this.props
        });
        return tile;
      }
      const tile = this.props.getTileData({ x, y, z });
      return tile;
    }
    return null;
  }
}

VivViewerLayerBase.layerName = 'VivViewerLayerBase';
VivViewerLayerBase.defaultProps = defaultProps;
