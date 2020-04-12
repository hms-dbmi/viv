import React, { PureComponent } from 'react';
import VivViewer from './VivViewer';
import { LinkedDetailView } from '../views';

export default class LinkedDetailViewer extends PureComponent {
  render() {
    const {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      initialViewState,
      colormap,
      panLock,
      zoomLock
    } = this.props;
    const detailViewLeft = new LinkedDetailView({
      initialViewState: { ...initialViewState, id: 'left' },
      linkedIds: ['right'],
      panLock,
      zoomLock
    });
    const detailViewRight = new LinkedDetailView({
      initialViewState: { ...initialViewState, id: 'right' },
      x: initialViewState.width,
      linkedIds: ['left'],
      panLock,
      zoomLock
    });
    const props = {
      loader,
      sliderValues,
      colorValues,
      channelIsOn,
      colormap
    };
    const views = [detailViewRight, detailViewLeft];
    const layerProps = [{ ...props }, { ...props }];
    return loader ? <VivViewer layerProps={layerProps} views={views} /> : null;
  }
}
