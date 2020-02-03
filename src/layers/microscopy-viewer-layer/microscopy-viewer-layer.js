import {MicroscopyViewerLayerBase} from './microscopy-viewer-layer-Base'
import {getTiffConnections,getZarrConnections} from './data-utils'
import {CompositeLayer} from '@deck.gl/core';

export class MicroscopyViewerLayer extends CompositeLayer {

  initializeState(){
    this.state = {
      connections: null
    }
  }

  shouldUpdateState({changeFlags}) {
     return changeFlags.somethingChanged;
   }

  updateState(){
    this.props.useTiff
    ? !this.state.connections && getTiffConnections({...this.props}).then((connections) => {
      this.setState({connections})
    })
    : !this.state.connections && getZarrConnections({...this.props}).then((connections) => {
      this.setState({connections})
    })
  }

  renderLayers() {
    const layers = this.state.connections ? new MicroscopyViewerLayerBase({connections: Object.assign({},...this.state.connections), ...this.props}) : []
    return layers
  }

}


MicroscopyViewerLayer.layerName = 'MicroscopyViewerLayer';
