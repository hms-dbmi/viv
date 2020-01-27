import React, {PureComponent} from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from 'deck.gl';
import MicroscopyViewerLayer from './microscopy-viewer-layer'

export default class MicroscopyViewer extends PureComponent {

  constructor(props){
    super(props)
    this._onWebGLInitialized = this._onWebGLInitialized.bind(this);
    this.state = {
      gl: null,
      sliderValues:{
        redSliderValue: 10000,
        greenSliderValue: 10000,
        blueSliderValue: 10000
      }
    };
  }

  _renderLayers(){
    const minZoom = Math.floor(-1 * Math.log2(Math.max(this.props.imageHeight, this.props.imageWidth)));
    return new MicroscopyViewerLayer({
      minZoom,
      sliderValues: this.state.sliderValues,
      ...this.props
    });
  }

  _onWebGLInitialized(gl) {
    this.setState({gl})
  }

  render() {
    var views = [new OrthographicView({id:'ortho', controller:true, height: this.props.viewHeight, width: this.props.viewWidth})]
    const initialViewState = this.props.initialViewState
    return (
      <DeckGL glOptions={{webgl2: true}} layers={this.state.gl ? this._renderLayers() : []} initialViewState={initialViewState} onWebGLInitialized={this._onWebGLInitialized} controller={true} views={views}>
      </DeckGL>
    );
  }
}
