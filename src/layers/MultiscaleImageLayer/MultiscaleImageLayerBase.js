import { TileLayer } from '@deck.gl/geo-layers';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { renderSubLayers } from './utils';

const defaultProps = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  sliderValues: { type: 'array', value: [], compare: true },
  colorValues: { type: 'array', value: [], compare: true },
  channelIsOn: { type: 'array', value: [], compare: true },
  renderSubLayers: { type: 'function', value: renderSubLayers, compare: false },
  colormap: { type: 'string', value: '', compare: true },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  unprojectLensBounds: { type: 'array', value: [0, 0, 0, 0], compare: true },
  isLensOn: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensRadius: { type: 'number', value: 100, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  transparentColor: { type: 'array', value: null, compare: true }
};

/**
 * This layer serves as a proxy of sorts to the rendering done in renderSubLayers, reacting to viewport changes in a custom manner.
 */
export default class MultiscaleImageLayerBase extends TileLayer {
  /**
   * This function allows us to controls which viewport gets to update the Tileset2D.
   * This is a uniquely TileLayer issue since it updates based on viewport updates thanks
   * to its ability to handle zoom-pan loading.  Essentially, with a picture-in-picture,
   * this prevents it from detecting the update of some other viewport that is unwanted.
   */
  _updateTileset() {
    if (!this.props.viewportId) {
      super._updateTileset();
    }
    if (
      (this.props.viewportId &&
        this.context.viewport.id === this.props.viewportId) ||
      // I don't know why, but DeckGL doesn't recognize multiple views on the first pass
      // so we force update on the first pass by checking if there is a viewport in the tileset.
      !this.state.tileset._viewport
    ) {
      super._updateTileset();
    }
  }
}

MultiscaleImageLayerBase.layerName = 'MultiscaleImageLayerBase';
MultiscaleImageLayerBase.defaultProps = defaultProps;
