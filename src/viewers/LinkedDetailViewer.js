import React from 'react';
import VivViewer from './VivViewer';
import { LinkedDetailView } from '../views';

const LinkedDetailViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    initialViewState,
    colormap,
    panLock,
    loaderSelection,
    zoomLock
  } = props;
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
  const layerConfig = {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    loaderSelection,
    colormap
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];
  return loader ? (
    <VivViewer layerProps={layerProps} views={views} randomize />
  ) : null;
};

export default LinkedDetailViewer;
