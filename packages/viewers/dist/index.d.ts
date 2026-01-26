type viewStateChangeProps = {
    viewId: string;
    viewState: object;
    oldViewState: object;
};
type ViewStateChange = (args: viewStateChangeProps) => any;
type Hover = (info: Object, event: Object) => any;
type HandleValue = (valueArray: Array<number>) => any;
type HandleCoordinate = (coordnate: Object) => any;
type HoverHooks = {
    handleValue: HandleValue;
    handleCoordinate: HandleCoordinate;
};
/**
 * This component wraps the DeckGL component.
 * @param {Object} props
 * @param {Array} props.layerProps  Props for the layers in each view.
 * @param {boolean} [props.randomize] Whether or not to randomize which view goes first (for dynamic rendering of multiple linked views).
 * @param {Array.<import('../views').VivView>} props.views Various `VivView`s to render.
 * @param {Array.<object>} props.viewStates List of objects like [{ target: [x, y, 0], zoom: -zoom, id: 'left' }, { target: [x, y, 0], zoom: -zoom, id: 'right' }]
 * @param {ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {HoverHooks} [props.hoverHooks] Object including utility hooks - an object with key handleValue like { handleValue: (valueArray) => {}, handleCoordinate: (coordinate) => {} } where valueArray
 * has the pixel values for the image under the hover location and coordinate is the coordinate in the image from which the values are picked.
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
declare function VivViewer(props: {
    layerProps: any[];
    randomize?: boolean | undefined;
    views: Array<any>;
    viewStates: Array<object>;
    onViewStateChange?: ViewStateChange | undefined;
    onHover?: Hover | undefined;
    hoverHooks?: HoverHooks | undefined;
    deckProps?: Object | undefined;
}): any;

/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colors List of [r, g, b] values for each channel.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.loader The data source for the viewer, PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data.
 * @param {Object} props.overview Allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.  See http://viv.gehlenborglab.org/#overviewview for defaults.
 * @param {Boolean} props.overviewOn Whether or not to show the OverviewView.
 * @param {import('./VivViewer').HoverHooks} [props.hoverHooks] Object including utility hooks - an object with key handleValue like { handleValue: (valueArray) => {}, handleCoordinate: (coordinate) => {} } where valueArray
 * has the pixel values for the image under the hover location and coordinate is the coordinate in the image from which the values are picked.
 * @param {Array} [props.viewStates] Array of objects like [{ target: [x, y, 0], zoom: -zoom, id: DETAIL_VIEW_ID }] for setting where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array} [props.extensions] [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 * @param {Boolean} [props.clickCenter] Click to center the default view. Default is true.
 * @param {boolean} [props.lensEnabled] Whether or not to use the lens (deafult false). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {boolean} [props.snapScaleBar] If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {function} [props.onViewportLoad] Function that gets called when the data in the viewport loads.
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
declare function PictureInPictureViewer(props: {
    contrastLimits: any[];
    colors: any[];
    channelsVisible: any[];
    colormap?: string | undefined;
    loader: any[];
    selections: any[];
    overview: Object;
    overviewOn: boolean;
    hoverHooks?: HoverHooks | undefined;
    viewStates?: any[] | undefined;
    height: number;
    width: number;
    extensions?: any[] | undefined;
    clickCenter?: boolean | undefined;
    lensEnabled?: boolean | undefined;
    lensSelection?: number | undefined;
    lensRadius?: number | undefined;
    lensBorderColor?: any[] | undefined;
    lensBorderRadius?: number | undefined;
    transparentColor?: any[] | undefined;
    snapScaleBar?: boolean | undefined;
    onViewStateChange?: ViewStateChange | undefined;
    onHover?: Hover | undefined;
    onViewportLoad?: Function | undefined;
    deckProps?: Object | undefined;
}): any;

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
 * @param {boolean} [props.snapScaleBar] If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
declare function SideBySideViewer(props: {
    contrastLimits: any[];
    colors: any[];
    channelsVisible: any[];
    colormap?: string | undefined;
    loader: any[];
    selections: any[];
    zoomLock: boolean;
    panLock: boolean;
    viewStates?: any[] | undefined;
    height: number;
    width: number;
    extensions?: any[] | undefined;
    lensEnabled?: boolean | undefined;
    lensSelection?: number | undefined;
    lensBorderColor?: any[] | undefined;
    lensBorderRadius?: number | undefined;
    lensRadius?: number | undefined;
    transparentColor?: any[] | undefined;
    snapScaleBar?: boolean | undefined;
    onViewStateChange?: ViewStateChange | undefined;
    onHover?: Hover | undefined;
    deckProps?: Object | undefined;
}): any;

/**
 * This component provides a volumetric viewer that provides provides volume-ray-casting.
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} [props.colors] List of [r, g, b] values for each channel - necessary if using one of the ColorPalette3DExtensions extensions.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap - necessary if using one of the AdditiveColormap3DExtensions extensions.
 * @param {Array} props.loader This data source for the viewer. PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data
 * @param {Array} [props.resolution] Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length - 1 the lowest with default loader.length - 1)
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {Object} [props.modelMatrix] A column major affine transformation to be applied to the volume.
 * @param {Array} [props.xSlice] 0-1 interval on which to slice the volume.
 * @param {Array} [props.ySlice] 0-1 interval on which to slice the volume.
 * @param {Array} [props.zSlice] 0-1 interval on which to slice the volume.
 * @param {function} [props.onViewportLoad] Function that gets called when the data in the viewport loads.
 * @param {Array} [props.viewStates] List of objects like [{ target: [x, y, z], zoom: -zoom, id: '3d' }] for initializing where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array.<Object>} [props.clippingPlanes] List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @param {Boolean} [props.useFixedAxis] Whether or not to fix the axis of the camera (default is true).
 * @param {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */
declare function VolumeViewer(props: {
    contrastLimits: any[];
    colors?: any[] | undefined;
    channelsVisible: any[];
    colormap?: string | undefined;
    loader: any[];
    selections: any[];
    resolution?: any[] | undefined;
    onViewStateChange?: ViewStateChange | undefined;
    modelMatrix?: Object | undefined;
    xSlice?: any[] | undefined;
    ySlice?: any[] | undefined;
    zSlice?: any[] | undefined;
    onViewportLoad?: Function | undefined;
    viewStates?: any[] | undefined;
    height: number;
    width: number;
    clippingPlanes?: Object[] | undefined;
    useFixedAxis?: boolean | undefined;
}): any;

export { PictureInPictureViewer, SideBySideViewer, VivViewer, VolumeViewer };
