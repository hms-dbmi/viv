import { ColorPaletteExtension } from '@vivjs/extensions';
import {
  SCALEBAR_VIEW_ID,
  ScaleBarView,
  SideBySideView,
  getDefaultInitialViewState
} from '@vivjs/views';
import * as React from 'react';
import VivViewer from './VivViewer';

/**
 * This component provides a side-by-side VivViewer with linked zoom/pan.
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colors List of [r, g, b] values for each channel.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.loader This data source for the viewer. PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data.
 * @param {Boolean} props.zoomLock Whether or not lock the zooms of the two views.
 * @param {Boolean} props.panLock Whether or not lock the pans of the two views.
 * @param {Array} [props.viewStates] List of objects like [{ target: [x, y, 0], zoom: -zoom, id: 'left' }, { target: [x, y, 0], zoom: -zoom, id: 'right' }] for initializing where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array} [props.extensions] [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 * @param {boolean} [props.lensEnabled] Whether or not to use the lens deafult (false).
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0).
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100).
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {boolean} [props.showScaleBar] If true, displays a scale bar on each side-by-side view. By default, false.
 * @param {string} [props.scaleBarUnit] Physical unit size per pixel for the scale bars (default: ''). Only used if showScaleBar is true.
 * @param {number} [props.scaleBarSize] Physical size of a pixel (default: 1). Only used if showScaleBar is true.
 * @param {string} [props.scaleBarPosition] Position of scale bars ('bottom-right', 'top-right', 'top-left', 'bottom-left'). Default is 'bottom-right'.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
const SideBySideViewer = props => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    panLock,
    selections,
    zoomLock,
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    transparentColor,
    showScaleBar = false,
    snapScaleBar = false,
    scaleBarPosition = 'bottom-right',
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const leftViewState = viewStatesProp?.find(v => v.id === 'left');
  const rightViewState = viewStatesProp?.find(v => v.id === 'right');
  // biome-ignore lint/correctness/useExhaustiveDependencies: Ignore carried over from eslint, without explanation.
  const viewStates = React.useMemo(() => {
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
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];

  // Add scale bar views if enabled and physical sizes are available
  if (showScaleBar) {
    const leftId = `left-${SCALEBAR_VIEW_ID}`;
    const rightId = `right-${SCALEBAR_VIEW_ID}`;
    const leftScalebarViewState = viewStatesProp?.find(
      v => v.id === leftId
    ) || { ...viewStates[0], id: leftId };
    const rightScalebarViewState = viewStatesProp?.find(
      v => v.id === rightId
    ) || { ...viewStates[1], id: rightId };
    const leftScaleBarView = new ScaleBarView({
      id: leftId,
      width: width / 2,
      height,
      loader,
      position: scaleBarPosition,
      snap: snapScaleBar,
      imageViewId: 'left'
    });
    const rightScaleBarView = new ScaleBarView({
      id: rightId,
      width: width / 2,
      height,
      x: width / 2,
      loader,
      position: scaleBarPosition,
      snap: snapScaleBar,
      imageViewId: 'right'
    });
    views.push(leftScaleBarView);
    views.push(rightScaleBarView);
    layerProps.push(layerConfig);
    layerProps.push(layerConfig);
    // Add viewStates for the scale bars (same as the corresponding side views)
    viewStates.push(leftScalebarViewState);
    viewStates.push(rightScalebarViewState);
  }
  const finalViewStates = [...viewStates];

  return loader ? (
    <VivViewer
      layerProps={layerProps}
      views={views}
      randomize
      onViewStateChange={onViewStateChange}
      onHover={onHover}
      viewStates={finalViewStates}
      deckProps={deckProps}
    />
  ) : null;
};

export default SideBySideViewer;
