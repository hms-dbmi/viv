import React from 'react';
import VivViewer from './VivViewer';
import { DetailView, OverviewView } from '../views';

/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Object} props.loader Loader to be used for fetching data.  It must have the properies `dtype`, `numLevels`, and `tileSize` and implement `getTile` and `getRaster`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {Object} props.overview Allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.
 * @param {Boolean} props.overviewOn Whether or not to show the OverviewView.
 * @param {Object} props.hoverHooks Object including the allowable hooks - right now only accepting a function with key handleValue like { handleValue: (valueArray) => {} }
 */

const PictureInPictureViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    initialViewState,
    colormap,
    overview,
    overviewOn,
    loaderSelection,
    hoverHooks
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
  if (!loader) return null;
  return (
    <VivViewer layerProps={layerProps} views={views} hoverHooks={hoverHooks} />
  );
};

export default PictureInPictureViewer;
