import { LayerExtension } from '@deck.gl/core';
import { RENDERING_MODES as RENDERING_NAMES } from '../../constants';

const defaultProps = {
  renderingMode: {
    type: 'string',
    value: RENDERING_NAMES.ADDITIVE,
    compare: true
  }
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * */
const Base3DExtension = class extends LayerExtension {
  initializeState(args) {
    this.setState({
      renderingMode: this.props.renderingMode || defaultProps.renderingMode
    });
    super.initializeState(args);
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.renderingMode !== oldProps.renderingMode) {
      const { gl } = this.context;
      this.setState({ renderingMode: props.renderingMode });
      if (this.state.model) {
        this.state.model.delete();
        this.setState({ model: this._getModel(gl) });
      }
    }
  }
};

Base3DExtension.extensionName = 'Base3DExtension';
Base3DExtension.defaultProps = defaultProps;

export default Base3DExtension;
