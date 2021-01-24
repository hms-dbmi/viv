import React, { useMemo } from 'react'; // eslint-disable-line import/no-unresolved
import VivViewer from './VivViewer';
import { SideBySideView, getDefaultInitialViewState } from '../views';
import useGlobalSelection from './global-selection-hook';
import { GLOBAL_SLIDER_DIMENSION_FIELDS } from '../constants';

/**
 * This component provides a side-by-side VivViewer with linked zoom/pan.
 * @param {Object} props
 * @param {Array} props.sliderValues List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colorValues List of [r, g, b] values for each channel.
 * @param {Array} props.channelIsOn List of boolean values for each channel for whether or not it is visible.
 * @param {string} props.colormap String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Object} props.loader Loader to be used for fetching data.  It must have the properies `dtype`, `numLevels`, `isRgb`, `isInterleaved`, and `tileSize` and implement `getTile`, `getRasterSize`, and `getRaster`.
 * @param {Array} props.loaderSelection Selection to be used for fetching data.
 * @param {Boolean} props.zoomLock Whether or not lock the zooms of the two views.
 * @param {Boolean} props.panLock Whether or not lock the pans of the two views.
 * @param {Array} [props.viewStates] List of objects like [{ target: [x, y, 0], zoom: -zoom, id: 'left' }, { target: [x, y, 0], zoom: -zoom, id: 'right' }] for initializing where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {boolean} [props.isLensOn] Whether or not to use the lens deafult (false).
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0).
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {Array} [transitionFields] A string array indicating which fields require a transition: Default: ['time', 'z'].
 */
const SideBySideViewer = props => {
  const {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    viewStates: viewStatesProp,
    colormap,
    panLock,
    loaderSelection,
    zoomLock,
    height,
    width,
    isLensOn = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    transparentColor,
    onViewStateChange,
    transitionFields = GLOBAL_SLIDER_DIMENSION_FIELDS
  } = props;
  const {
    newLoaderSelection,
    oldLoaderSelection,
    onViewportLoad
  } = useGlobalSelection(loaderSelection, transitionFields);
  const leftViewState = viewStatesProp?.find(v => v.id === 'left');
  const rightViewState = viewStatesProp?.find(v => v.id === 'right');
  const viewStates = useMemo(() => {
    if (leftViewState && rightViewState) {
      return viewStatesProp;
    }
    const defaultViewState = getDefaultInitialViewState(
      loader,
      { height, width: width / 2 },
      0.5
    );
    return [
      leftViewState || { ...defaultViewState, id: 'left' },
      rightViewState || { ...defaultViewState, id: 'right' }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, leftViewState, rightViewState]);

  const detailViewLeft = new SideBySideView({
    id: 'left',
    linkedIds: ['right'],
    panLock,
    zoomLock,
    height,
    width: width / 2
  });
  const detailViewRight = new SideBySideView({
    id: 'right',
    x: width / 2,
    linkedIds: ['left'],
    panLock,
    zoomLock,
    height,
    width: width / 2
  });
  const layerConfig = {
    loader,
    sliderValues,
    colorValues,
    channelIsOn,
    loaderSelection: oldLoaderSelection,
    newLoaderSelection,
    onViewportLoad,
    transitionFields,
    colormap,
    isLensOn,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    transparentColor
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];
  return loader ? (
    <VivViewer
      layerProps={layerProps}
      views={views}
      randomize
      onViewStateChange={onViewStateChange}
      viewStates={viewStates}
    />
  ) : null;
};

export default SideBySideViewer;
