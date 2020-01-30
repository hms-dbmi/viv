import React, {PureComponent} from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from 'deck.gl';
import { MicroscopyViewerLayer } from './layers'
import { loadZarr } from './data-utils'

export class MicroscopyViewer extends PureComponent {

  constructor(props){
    super(props)
    this._onWebGLInitialized = this._onWebGLInitialized.bind(this);
    this.state = {
      gl: null
    };
  }

  _renderLayers(){
    const minZoom = Math.floor(-1 * Math.log2(Math.max(this.props.imageHeight, this.props.imageWidth)));
    const {sliderValues, colorValues} = this.props
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
      orderedSliderValues.push(65535);
    }
    var diff = 6 - orderedColorValues.length
    for (var j = 0; j < diff; j++) {
      orderedColorValues.push([0,0,0]);
    }
    orderedColorValues = orderedColorValues.map(color => color.map(ch => ch / 255))
    const overrideValuesProps = Object.assign(
      {}, this.props, {
        sliderValues: orderedSliderValues,
        colorValues: orderedColorValues,
      }
    )
    return new MicroscopyViewerLayer({
      minZoom,
      getTileData: this.props.useZarr
        ? ({ x, y, z }) => {
          return loadZarr({
            x, y, z: -1 * z, ...this.props,
          });
        }
        : this.props.getTileData,
      ...overrideValuesProps
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
