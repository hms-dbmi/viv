import React from 'react';
import VivViewer from './VivViewer';
import { DetailView, OverviewView } from '../views';

const OverviewDetailViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    initialViewState,
    colormap,
    overview,
    overviewOn,
    loaderSelection
  } = props;
  const detailViewState = { ...initialViewState, id: 'detail' };
  const detailView = new DetailView({ initialViewState: detailViewState });
  const layerConfig = {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    loaderSelection,
    colormap
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  if (overviewOn && loader) {
    const overviewViewState = { ...initialViewState, id: 'overview' };
    const overviewView = new OverviewView({
      initialViewState: overviewViewState,
      loader,
      detailHeight: initialViewState.height,
      detailWidth: initialViewState.width,
      ...overview
    });
    views.push(overviewView);
    layerProps.push(layerConfig);
  }
  return loader ? <VivViewer layerProps={layerProps} views={views} /> : null;
};

export default OverviewDetailViewer;
