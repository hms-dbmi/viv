import React from 'react'; // eslint-disable-line import/no-unresolved
import VivViewer from './VivViewer';
import {
  DetailView,
  OverviewView,
  getDefaultInitialViewState,
  DETAIL_VIEW_ID,
  OVERVIEW_VIEW_ID
} from '../views';

/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Object} props.loader Loader to be used for fetching data.  It must have the properies `dtype`, `numLevels`, `isPyramid`, and `tileSize` and implement `getTile`, `getRaster`, and `getRasterSize`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {Object} props.overview Allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.  See http://viv.gehlenborglab.org/#overviewview for defaults.
 * @param {Boolean} props.overviewOn Whether or not to show the OverviewView.
 * @param {Object} props.hoverHooks Object including the allowable hooks - right now only accepting a function with key handleValue like { handleValue: (valueArray) => {} } where valueArray
 * has the pixel values for the image under the hover location.
 * @param {Object} props.initialViewState Object like { target: [x, y, 0], zoom: -zoom } for initializing where the viewer looks (optional - this can be inferred from height/width/loader).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {boolean} [props.isLensOn] Whether or not to use the lens (deafult false).
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0).
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100).
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {Boolean} [props.clickCenter] Click to center the default view. Default is true.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
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
    lensBorderRadius = 0.02,
    clickCenter = true,
    onViewStateChange
  } = props;
  const viewState =
    initialViewState || getDefaultInitialViewState(loader, { height, width });
  const detailViewState = { ...viewState, id: DETAIL_VIEW_ID };
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
    const overviewViewState = { ...viewState, id: OVERVIEW_VIEW_ID };
    const overviewView = new OverviewView({
      initialViewState: overviewViewState,
      loader,
      detailHeight: height,
      detailWidth: width,
      clickCenter,
      ...overview
    });
    views.push(overviewView);
    layerProps.push(layerConfig);
  }
  if (!loader) return null;
  return (
    <VivViewer
      layerProps={layerProps}
      views={views}
      hoverHooks={hoverHooks}
      onViewStateChange={onViewStateChange}
    />
  );
};

export default PictureInPictureViewer;
