import React from 'react';
import VivViewer from './VivViewer';
import { LinkedDetailView } from '../views';

/**
 * This component provides a component for a side-by-side VivViewer with linked zoom/pan.
 * @param {Array} sliderValues The list of [min, max] values for each channe to control rendering.
 * @param {Array} colorValues The list of [r, g, b] values for each channel.
 * @param {Array} channelIsOn The list of boolean values for each channel for whether or not it is visible.
 * @param {string} colormap A string indicating a colormap (default: '').
 * @param {Object} loader The loader to be used for fetching data.  It must implement/return `getTile`, `dtype`, `numLevels`, and `tileSize`, and `getRaster`.
 * @param {Array} loaderSelection The selection to be used for fetching data.
 * @param {Boolean} zoomLock Whether or not lock the zooms of the two views.
 * @param {Boolean} panLock Whether or not lock the pans of the two views.
 */
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
