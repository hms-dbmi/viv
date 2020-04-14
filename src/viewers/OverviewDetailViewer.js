import React from 'react';
import VivViewer from './VivViewer';
import { DetailView, OverviewView } from '../views';

/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Array} sliderValues The list of [min, max] values for each channe to control rendering.
 * @param {Array} colorValues The list of [r, g, b] values for each channel.
 * @param {Array} channelIsOn The list of boolean values for each channel for whether or not it is visible.
 * @param {string} colormap A string indicating a colormap (default: '').
 * @param {Object} loader The loader to be used for fetching data.  It must implement/return `getTile`, `dtype`, `numLevels`, and `tileSize`, and `getRaster`.
 * @param {Array} loaderSelection The selection to be used for fetching data.
 * @param {Object} overview This allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.
 * @param {Boolean} OverviewOn Whether or not to show the OverviewView.
 */

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
