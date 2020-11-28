import React from 'react'; // eslint-disable-line import/no-unresolved
import VivViewer from './VivViewer';
import { DetailView, OverviewView, getDefaultInitialViewState } from '../views';

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
 * @param {number} props.initialViewState Object like { target: [x, y, 0], zoom: -zoom } for initializing where the viewer looks (optional - this can be inferred from height/width/loader).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {boolean} props.isLensOn Whether or not to use the lens (deafult false).
 * @param {number} props.lensSelection Numeric index of the channel to be focused on by the lens (default 0).
 * @param {number} props.lensRadius Pixel radius of the lens (default: 100).
 * @param {number} props.lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} props.lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
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
    hoverHooks,
    height,
    width,
    isLensOn = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02
  } = props;
  let viewState = initialViewState;
  if (height && width && !initialViewState) {
    viewState = getDefaultInitialViewState(loader, { height, width });
  }
  const detailViewState = { ...viewState, id: 'detail' };
  const detailView = new DetailView({
    initialViewState: detailViewState,
    height,
    width
  });
  const layerConfig = {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    loaderSelection,
    colormap,
    isLensOn,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  if (overviewOn && loader) {
    const overviewViewState = { ...viewState, id: 'overview' };
    const overviewView = new OverviewView({
      initialViewState: overviewViewState,
      loader,
      detailHeight: height,
      detailWidth: width,
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
