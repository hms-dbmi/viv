import * as _vivjs_types from '@vivjs/types';
import { Matrix4 } from '@math.gl/core';

type LayerProps$7 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * Image pyramid. PixelSource[], where each PixelSource is decreasing in shape.
     */
    loader: any[];
    /**
     * Selection to be used for fetching data.
     */
    selections: any[];
    /**
     * Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
     */
    domain?: Array<Array<number>> | undefined;
    /**
     * Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
     */
    viewportId?: string | undefined;
    /**
     * Unique identifier for this layer.
     */
    id?: string | undefined;
    /**
     * Custom override for handle tile fetching errors.
     */
    onTileError?: Function | undefined;
    /**
     * Hook function from deck.gl to handle hover objects.
     */
    onHover?: Function | undefined;
    /**
     * Maximum parallel ongoing requests allowed before aborting.
     */
    maxRequests?: number | undefined;
    /**
     * Hook function from deck.gl to handle clicked-on objects.
     */
    onClick?: Function | undefined;
    /**
     * Math.gl Matrix4 object containing an affine transformation to be applied to the image.
     */
    modelMatrix?: Object | undefined;
    /**
     * 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
     */
    refinementStrategy?: string | undefined;
    /**
     * Whether to exclude the background image. The background image is also excluded for opacity!=1.
     */
    excludeBackground?: boolean | undefined;
    /**
     * [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
     */
    extensions?: any[] | undefined;
};
/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader Image pyramid. PixelSource[], where each PixelSource is decreasing in shape.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onTileError Custom override for handle tile fetching errors.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {number=} maxRequests Maximum parallel ongoing requests allowed before aborting.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {string=} refinementStrategy 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
 * @property {boolean=} excludeBackground Whether to exclude the background image. The background image is also excluded for opacity!=1.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */
/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
declare const MultiscaleImageLayer: {
    new <S extends string[]>(...props: _vivjs_types.Viv<LayerProps$7, S>[]): any;
};

type LayerProps$6 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * PixelSource. Represents an N-dimensional image.
     */
    loader: Object;
    /**
     * Selection to be used for fetching data.
     */
    selections: any[];
    /**
     * Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
     */
    domain?: Array<Array<number>> | undefined;
    /**
     * Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
     */
    viewportId?: string | undefined;
    /**
     * Hook function from deck.gl to handle hover objects.
     */
    onHover?: Function | undefined;
    /**
     * Hook function from deck.gl to handle clicked-on objects.
     */
    onClick?: Function | undefined;
    /**
     * Math.gl Matrix4 object containing an affine transformation to be applied to the image.
     */
    modelMatrix?: Object | undefined;
    /**
     * Function that gets called when the data in the viewport loads.
     */
    onViewportLoad?: Function | undefined;
    /**
     * Unique identifier for this layer.
     */
    id?: string | undefined;
    /**
     * [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
     */
    extensions?: any[] | undefined;
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Object} loader PixelSource. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */
/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
declare const ImageLayer: {
    new <S extends string[]>(...props: _vivjs_types.Viv<LayerProps$6, S>[]): any;
};

type LayerProps$5 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * PixelSource[]. Assumes multiscale if loader.length > 1.
     */
    loader: any[];
    /**
     * Selection to be used for fetching data.
     */
    selections: any[];
    /**
     * [r, g, b] color of the bounding box (default: [255, 0, 0]).
     */
    boundingBoxColor?: Array<number> | undefined;
    /**
     * Width of the bounding box in px (default: 1).
     */
    boundingBoxOutlineWidth?: number | undefined;
    /**
     * [r, g, b] color of the outline (default: [255, 190, 0]).
     */
    viewportOutlineColor?: Array<number> | undefined;
    /**
     * Viewport outline width in px (default: 2).
     */
    viewportOutlineWidth?: number | undefined;
    /**
     * Unique identifier for this layer.
     */
    id?: string | undefined;
    /**
     * [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
     */
    extensions?: any[] | undefined;
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Assumes multiscale if loader.length > 1.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<number>=} boundingBoxColor [r, g, b] color of the bounding box (default: [255, 0, 0]).
 * @property {number=} boundingBoxOutlineWidth Width of the bounding box in px (default: 1).
 * @property {Array.<number>=} viewportOutlineColor [r, g, b] color of the outline (default: [255, 190, 0]).
 * @property {number=} viewportOutlineWidth Viewport outline width in px (default: 2).
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */
/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
declare const OverviewLayer: {
    new <S extends string[]>(...props: _vivjs_types.Viv<LayerProps$5, S>[]): any;
};

type LayerProps$4 = {
    /**
     * Physical unit size per pixel at full resolution.
     */
    unit: string;
    /**
     * Physical size of a pixel.
     */
    size: number;
    /**
     * The current viewState for the desired view.  We cannot internally use this.context.viewport because it is one frame behind:
     * https://github.com/visgl/deck.gl/issues/4504
     */
    viewState: Object;
    /**
     * Boudning box of the view in which this should render.
     */
    boundingBox?: any[] | undefined;
    /**
     * Id from the parent layer.
     */
    id?: string | undefined;
    /**
     * Value from 0 to 1 representing the portion of the view to be used for the length part of the scale bar.
     */
    length?: number | undefined;
    /**
     * If true, aligns the scale bar value to predefined intervals for clearer readings, adjusting units if necessary.
     */
    snap: boolean;
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {String} unit Physical unit size per pixel at full resolution.
 * @property {Number} size Physical size of a pixel.
 * @property {Object} viewState The current viewState for the desired view.  We cannot internally use this.context.viewport because it is one frame behind:
 * https://github.com/visgl/deck.gl/issues/4504
 * @property {Array=} boundingBox Boudning box of the view in which this should render.
 * @property {string=} id Id from the parent layer.
 * @property {number=} length Value from 0 to 1 representing the portion of the view to be used for the length part of the scale bar.
 * @property {boolean} snap If true, aligns the scale bar value to predefined intervals for clearer readings, adjusting units if necessary.
 */
/**
 * @type {{ new(...props: LayerProps[]) }}
 * @ignore
 */
declare const ScaleBarLayer: {
    new (...props: LayerProps$4[]): any;
};

type LayerProps$3 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * PixelSource[]. Represents an N-dimensional image.
     */
    loader: any[];
    /**
     * Selection to be used for fetching data.
     */
    selections: any[];
    /**
     * Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
     */
    domain?: Array<Array<number>> | undefined;
    /**
     * Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length -1 the lowest default 0)
     */
    resolution?: number | undefined;
    /**
     * A column major affine transformation to be applied to the volume.
     */
    modelMatrix?: Object | undefined;
    /**
     * 0-width (physical coordinates) interval on which to slice the volume.
     */
    xSlice?: Array<number> | undefined;
    /**
     * 0-height (physical coordinates) interval on which to slice the volume.
     */
    ySlice?: Array<number> | undefined;
    /**
     * 0-depth (physical coordinates) interval on which to slice the volume.
     */
    zSlice?: Array<number> | undefined;
    /**
     * Function that gets called when the data in the viewport loads.
     */
    onViewportLoad?: Function | undefined;
    /**
     * List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
     */
    clippingPlanes?: Array<Object> | undefined;
    /**
     * Whether or not to use the default progress text + indicator (default is true)
     */
    useProgressIndicator?: boolean | undefined;
    /**
     * A callback to be used for getting updates of the progress, ({ progress }) => {}
     */
    onUpdate?: Function | undefined;
    /**
     * [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
     */
    extensions?: any[] | undefined;
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {number=} resolution Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length -1 the lowest default 0)
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {boolean=} useProgressIndicator Whether or not to use the default progress text + indicator (default is true)
 * @property {function=} onUpdate A callback to be used for getting updates of the progress, ({ progress }) => {}
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */
/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
declare const VolumeLayer: {
    new <S extends string[]>(...props: _vivjs_types.Viv<LayerProps$3, S>[]): any;
};

type LayerProps$2 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * Dtype for the layer.
     */
    dtype: string;
    /**
     * Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
     */
    domain?: Array<number> | undefined;
    /**
     * Unique identifier for this layer.
     */
    id?: string | undefined;
    /**
     * Hook function from deck.gl to handle hover objects.
     */
    onHover?: Function | undefined;
    /**
     * Hook function from deck.gl to handle clicked-on objects.
     */
    onClick?: Function | undefined;
    /**
     * Math.gl Matrix4 object containing an affine transformation to be applied to the image.
     * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
     */
    modelMatrix?: Object | undefined;
    /**
     * The `minFilter` and `magFilter` for luma.gl rendering (see https://luma.gl/docs/api-reference/core/resources/sampler#texture-magnification-filter) - default is 'nearest'
     */
    interpolation?: ("nearest" | "linear") | undefined;
};
/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<number>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {'nearest'|'linear'=} interpolation The `minFilter` and `magFilter` for luma.gl rendering (see https://luma.gl/docs/api-reference/core/resources/sampler#texture-magnification-filter) - default is 'nearest'
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
declare const XRLayer: {
    new (...props: _vivjs_types.Viv<LayerProps$2>[]): any;
};

type LayerProps$1 = {
    /**
     * List of [begin, end] values to control each channel's ramp function.
     */
    contrastLimits: Array<Array<number>>;
    /**
     * List of boolean values for each channel for whether or not it is visible.
     */
    channelsVisible: Array<boolean>;
    /**
     * Dtype for the layer.
     */
    dtype: string;
    /**
     * Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
     */
    domain?: Array<Array<number>> | undefined;
    /**
     * A column major affine transformation to be applied to the volume.
     */
    modelMatrix?: Object | undefined;
    /**
     * 0-width (physical coordinates) interval on which to slice the volume.
     */
    xSlice?: Array<number> | undefined;
    /**
     * 0-height (physical coordinates) interval on which to slice the volume.
     */
    ySlice?: Array<number> | undefined;
    /**
     * 0-depth (physical coordinates) interval on which to slice the volume.
     */
    zSlice?: Array<number> | undefined;
    /**
     * List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
     */
    clippingPlanes?: Array<Object> | undefined;
    /**
     * Matrix for scaling the volume based on the (downsampled) resolution being displayed.
     */
    resolutionMatrix?: Object | undefined;
    /**
     * [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
     */
    extensions?: any[] | undefined;
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {Object=} resolutionMatrix Matrix for scaling the volume based on the (downsampled) resolution being displayed.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */
/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
declare const XR3DLayer: {
    new <S extends string[]>(...props: _vivjs_types.Viv<LayerProps$1>[]): any;
};

type LayerProps = {
    /**
     * Opacity of the layer.
     */
    opacity?: number | undefined;
    /**
     * Hook function from deck.gl to handle clicked-on objects.
     */
    onClick?: Function | undefined;
    /**
     * Math.gl Matrix4 object containing an affine transformation to be applied to the image.
     */
    modelMatrix?: Object | undefined;
    /**
     * One of WhiteIsZero BlackIsZero YCbCr or RGB (default)
     */
    photometricInterpretation?: number | undefined;
    /**
     * An RGB (0-255 range) color to be considered "transparent" if provided.
     * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
     * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
     * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
     */
    transparentColor?: Array<number> | undefined;
    /**
     * Unique identifier for this layer.
     */
    id?: string | undefined;
};
/**
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {number=} photometricInterpretation One of WhiteIsZero BlackIsZero YCbCr or RGB (default)
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {String=} id Unique identifier for this layer.
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
declare const BitmapLayer: {
    new (...props: _vivjs_types.Viv<LayerProps>[]): any;
};

/**
 * @template T
 * @param {T[]} arr
 * @param {T} defaultValue
 * @param {number} padWidth
 */
declare function padWithDefault<T>(arr: T[], defaultValue: T, padWidth: number): T[];
/**
 * Get physical size scaling Matrix4
 * @param {Object} loader PixelSource
 */
declare function getPhysicalSizeScalingMatrix(loader: Object): Matrix4;
/**
 * Create a bounding box from a viewport based on passed-in viewState.
 * @param {Object} viewState The viewState for a certain viewport.
 * @returns {View} The DeckGL View for this viewport.
 */
declare function makeBoundingBox(viewState: Object): View;

export { BitmapLayer, ImageLayer, MultiscaleImageLayer, OverviewLayer, ScaleBarLayer, VolumeLayer, XR3DLayer, XRLayer, getPhysicalSizeScalingMatrix, makeBoundingBox, padWithDefault };
