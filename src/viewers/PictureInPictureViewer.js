import React, { useMemo } from 'react'; // eslint-disable-line import/no-unresolved
import VivViewer from './VivViewer';
import {
  DetailView,
  OverviewView,
  getDefaultInitialViewState,
  DETAIL_VIEW_ID,
  OVERVIEW_VIEW_ID
} from '../views';
import useGlobalSelection from './global-selection-hook';
import { GLOBAL_SLIDER_DIMENSION_FIELDS } from '../constants';

/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.loader The data source for the viewer, PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {Object} props.overview Allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.  See http://viv.gehlenborglab.org/#overviewview for defaults.
 * @param {Boolean} props.overviewOn Whether or not to show the OverviewView.
 * @param {import('./VivViewer').HoverHooks} [props.hoverHooks] Object including utility hooks - an object with key handleValue like { handleValue: (valueArray) => {}, handleCoordinate: (coordinate) => {} } where valueArray
 * has the pixel values for the image under the hover location and coordinate is the coordinate in the image from which the values are picked.
 * @param {Array} [props.viewStates] Array of objects like [{ target: [x, y, 0], zoom: -zoom, id: DETAIL_VIEW_ID }] for setting where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {boolean} [props.isLensOn] Whether or not to use the lens (deafult false).
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0).
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100).
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {Boolean} [props.clickCenter] Click to center the default view. Default is true.
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {Array} [props.transitionFields] A string array indicating which fields require a transition when making a new selection: Default: ['t', 'z'].
 * @param {function} [props.onViewportLoad] Function that gets called when the data in the viewport loads.
 * @param {Object} [props.glOptions] Additional options used when creating the WebGLContext.
 */

const PictureInPictureViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    viewStates: viewStatesProp,
    colormap,
    overview,
    overviewOn,
    loaderSelection,
    hoverHooks = { handleValue: () => {}, handleCoordinate: () => {} },
    height,
    width,
    isLensOn = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    clickCenter = true,
    transparentColor,
    onViewStateChange,
    onHover,
    transitionFields = GLOBAL_SLIDER_DIMENSION_FIELDS,
    onViewportLoad,
    glOptions
  } = props;
  const {
    newLoaderSelection,
    oldLoaderSelection,
    onViewportLoad: transitionOnViewportLoad
  } = useGlobalSelection(loaderSelection, transitionFields);
  const detailViewState = viewStatesProp?.find(v => v.id === DETAIL_VIEW_ID);
  const baseViewState = useMemo(() => {
    return (
      detailViewState ||
      getDefaultInitialViewState(loader, { height, width }, 0.5)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, detailViewState]);

  const detailView = new DetailView({
    id: DETAIL_VIEW_ID,
    height,
    width
  });
  const layerConfig = {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    loaderSelection: oldLoaderSelection,
    newLoaderSelection,
    onViewportLoad,
    transitionOnViewportLoad,
    transitionFields,
    colormap,
    isLensOn,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    transparentColor
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  const viewStates = [{ ...baseViewState, id: DETAIL_VIEW_ID }];
  if (overviewOn && loader) {
    // It's unclear why this is needed because OverviewView.filterViewState sets "zoom" and "target".
    const overviewViewState = viewStatesProp?.find(
      v => v.id === OVERVIEW_VIEW_ID
    ) || { ...baseViewState, id: OVERVIEW_VIEW_ID };
    const overviewView = new OverviewView({
      id: OVERVIEW_VIEW_ID,
      loader,
      detailHeight: height,
      detailWidth: width,
      clickCenter,
      ...overview
    });
    views.push(overviewView);
    layerProps.push(layerConfig);
    viewStates.push(overviewViewState);
  }
  if (!loader) return null;
  return (
    <VivViewer
      layerProps={layerProps}
      views={views}
      viewStates={viewStates}
      hoverHooks={hoverHooks}
      onViewStateChange={onViewStateChange}
      onHover={onHover}
      glOptions={glOptions}
    />
  );
};

export default PictureInPictureViewer;
