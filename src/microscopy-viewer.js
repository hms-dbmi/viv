import React, { PureComponent } from 'react';
import DeckGL from '@deck.gl/react';
import { OrthographicView } from 'deck.gl';
import { MicroscopyViewerLayer } from './layers';

export class MicroscopyViewer extends PureComponent {
  constructor(props) {
    super(props);
    this._onWebGLInitialized = this._onWebGLInitialized.bind(this);
    this.state = {
      gl: null
    };
  }

  _renderLayers() {
    const { imageHeight, imageWidth, tileSize } = this.props;
    const zoom = {
      minZoom: Math.floor(
        -1 * Math.log2(Math.max(imageHeight / tileSize, imageWidth / tileSize))
      ),
      maxZoom: 0
    };
    return new MicroscopyViewerLayer({
      ...this.props,
      ...zoom
    });
  }

  _onWebGLInitialized(gl) {
    this.setState({ gl });
  }

  render() {
    /* eslint-disable react/destructuring-assignment */
    const views = [
      new OrthographicView({
        id: 'ortho',
        controller: true,
        height: this.props.viewHeight,
        width: this.props.viewWidth
      })
    ];
    const { initialViewState } = this.props;
    return (
      <DeckGL
        glOptions={{ webgl2: true }}
        layers={this.state.gl ? this._renderLayers() : []}
        initialViewState={initialViewState}
        onWebGLInitialized={this._onWebGLInitialized}
        controller
        views={views}
      />
    );
    /* eslint-disable react/destructuring-assignment */
  }
}
