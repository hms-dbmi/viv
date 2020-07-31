import React from 'react';
import VivViewer from './VivViewer';
import { SideBySideView } from '../views';

/**
 * This component provides a side-by-side VivViewer with linked zoom/pan.
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Object} props.loader Loader to be used for fetching data.  It must have the properies `dtype`, `numLevels`, and `tileSize` and implement `getTile` and `getRaster`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {Boolean} props.zoomLock Whether or not lock the zooms of the two views.
 * @param {Boolean} props.panLock Whether or not lock the pans of the two views.
 */
const SideBySideViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    initialViewState,
    colormap,
    panLock,
    loaderSelection,
    zoomLock,
    isLensOn,
    lensSelection
  } = props;
  const detailViewLeft = new SideBySideView({
    initialViewState: { ...initialViewState, id: 'left' },
    linkedIds: ['right'],
    panLock,
    zoomLock
  });
  const detailViewRight = new SideBySideView({
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
    colormap,
    isLensOn,
    lensSelection
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];
  return loader ? (
    <VivViewer layerProps={layerProps} views={views} randomize />
  ) : null;
};

export default SideBySideViewer;
