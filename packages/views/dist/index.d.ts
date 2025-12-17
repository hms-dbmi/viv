import { OrbitView, OrthographicView } from '@deck.gl/core';

/**
 * This class generates a layer and a view for use in the VivViewer
 * @param {Object} args
 * @param {string} args.id id for this VivView.
 * @param {Object} args.height Width of the view.
 * @param {Object} args.width Height of the view.
 * @param {string} args.id Id for the current view
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 */
declare class VivView {
    constructor({ id, x, y, height, width }: {
        id: any;
        x?: number | undefined;
        y?: number | undefined;
        height: any;
        width: any;
    });
    width: any;
    height: any;
    id: any;
    x: number;
    y: number;
    /**
     * Create a DeckGL view based on this class.
     * @returns {View} The DeckGL View for this class.
     */
    getDeckGlView(): View;
    /**
     * Create a viewState for this class, checking the id to make sure this class and veiwState match.
     * @param {Object} args
     * @param {object} [args.viewState] incoming ViewState object from deck.gl update.
     * @param {object} [args.oldViewState] old ViewState object from deck.gl.
     * @param {object} [args.currentViewState] current ViewState object in react state.
     * @returns {?object} ViewState for this class (or null by default if the ids do not match).
     */
    filterViewState({ viewState }: {
        viewState?: object | undefined;
        oldViewState?: object | undefined;
        currentViewState?: object | undefined;
    }): object | null;
    /**
     * Create a layer for this instance.
     * @param {Object} args
     * @param {Object<string,Object>} args.viewStates ViewStates for all current views.
     * @param {Object} args.props Props for this instance.
     * @returns {Layer} Instance of a layer.
     */
    getLayers({ viewStates, props }: {
        viewStates: {
            [x: string]: Object;
        };
        props: Object;
    }): Layer;
}

/**
 * This class generates a MultiscaleImageLayer and a view for use in the SideBySideViewer.
 * It is linked with its other views as controlled by `linkedIds`, `zoomLock`, and `panLock` parameters.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {Array<String>} args.linkedIds Ids of the other views to which this could be locked via zoom/pan.
 * @param {Boolean} args.panLock Whether or not we lock pan.
 * @param {Boolean} args.zoomLock Whether or not we lock zoom.
 * @param {Array=} args.viewportOutlineColor Outline color of the border (default [255, 255, 255])
 * @param {number=} args.viewportOutlineWidth Default outline width (default 10)
 * @param {boolean=} args.snapScaleBar If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
declare class SideBySideView extends VivView {
    constructor({ id, x, y, height, width, linkedIds, panLock, zoomLock, viewportOutlineColor, viewportOutlineWidth, snapScaleBar }: {
        id: any;
        x?: number | undefined;
        y?: number | undefined;
        height: any;
        width: any;
        linkedIds?: never[] | undefined;
        panLock?: boolean | undefined;
        zoomLock?: boolean | undefined;
        viewportOutlineColor?: number[] | undefined;
        viewportOutlineWidth?: number | undefined;
        snapScaleBar?: boolean | undefined;
    });
    linkedIds: any[];
    panLock: boolean;
    zoomLock: boolean;
    viewportOutlineColor: number[];
    viewportOutlineWidth: number;
    snapScaleBar: boolean;
    filterViewState({ viewState, oldViewState, currentViewState }: {
        viewState: any;
        oldViewState: any;
        currentViewState: any;
    }): {
        id: any;
        target: any;
        zoom: any;
        height: any;
        width: any;
    };
    getLayers({ props, viewStates }: {
        props: any;
        viewStates: any;
    }): any[][];
}

/**
 * This class generates a VolumeLayer and a view for use in the VivViewer as volumetric rendering.
 * @param {Object} args
 * @param {Array<number>} args.target Centered target for the camera (used if useFixedAxis is true)
 * @param {Boolean} args.useFixedAxis Whether or not to fix the axis of the camera.
 * */
declare class VolumeView extends VivView {
    constructor({ target, useFixedAxis, ...args }: {
        [x: string]: any;
        target: any;
        useFixedAxis: any;
    });
    target: any;
    useFixedAxis: any;
    getDeckGlView(): OrbitView;
    filterViewState({ viewState }: {
        viewState: any;
    }): any;
    getLayers({ props }: {
        props: any;
    }): any[];
}

declare const DETAIL_VIEW_ID: "detail";
/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {boolean=} args.snapScaleBar If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
declare class DetailView extends VivView {
    constructor({ id, x, y, height, width, snapScaleBar }: {
        id: any;
        x?: number | undefined;
        y?: number | undefined;
        height: any;
        width: any;
        snapScaleBar?: boolean | undefined;
    });
    snapScaleBar: boolean;
    getLayers({ props, viewStates }: {
        props: any;
        viewStates: any;
    }): any[][];
    filterViewState({ viewState, currentViewState }: {
        viewState: any;
        currentViewState: any;
    }): any;
}

declare const OVERVIEW_VIEW_ID: "overview";
/**
 * This class generates a OverviewLayer and a view for use in the VivViewer as an overview to a Detailview (they must be used in conjection).
 * From the base class VivView, only the initialViewState argument is used.  This class uses private methods to position its x and y from the
 * additional arguments:
 * @param {Object} args
 * @param {Object} args.id for thie VivView
 * @param {Object} args.loader PixelSource[], where each PixelSource is decreasing in shape. If length == 1, not multiscale.
 * @param {number} args.detailHeight Height of the detail view.
 * @param {number} args.detailWidth Width of the detail view.
 * @param {number} [args.scale] Scale of this viewport relative to the detail. Default is .2.
 * @param {number} [args.margin] Margin to be offset from the the corner of the other viewport. Default is 25.
 * @param {string} [args.position] Location of the viewport - one of "bottom-right", "top-right", "top-left", "bottom-left."  Default is 'bottom-right'.
 * @param {number} [args.minimumWidth] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumWidth] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {number} [args.minimumHeight] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumHeight] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {Boolean} [args.clickCenter] Click to center the default view. Default is true.
 * */
declare class OverviewView extends VivView {
    constructor({ id, loader, detailHeight, detailWidth, scale, margin, position, minimumWidth, maximumWidth, minimumHeight, maximumHeight, clickCenter }: {
        id: any;
        loader: any;
        detailHeight: any;
        detailWidth: any;
        scale?: number | undefined;
        margin?: number | undefined;
        position?: string | undefined;
        minimumWidth?: number | undefined;
        maximumWidth?: number | undefined;
        minimumHeight?: number | undefined;
        maximumHeight?: number | undefined;
        clickCenter?: boolean | undefined;
    });
    margin: number;
    loader: any;
    position: string;
    detailHeight: any;
    detailWidth: any;
    clickCenter: boolean;
    /**
     * Set the image-pixel scale and height and width based on detail view.
     */
    _setHeightWidthScale({ detailWidth, detailHeight, scale, minimumWidth, maximumWidth, minimumHeight, maximumHeight }: {
        detailWidth: any;
        detailHeight: any;
        scale: any;
        minimumWidth: any;
        maximumWidth: any;
        minimumHeight: any;
        maximumHeight: any;
    }): void;
    _imageWidth: number | undefined;
    _imageHeight: number | undefined;
    scale: number | undefined;
    /**
     * Set the x and y (top left corner) of this overview relative to the detail.
     */
    _setXY(): void;
    getDeckGlView(): OrthographicView;
    filterViewState({ viewState }: {
        viewState: any;
    }): any;
    getLayers({ viewStates, props }: {
        viewStates: any;
        props: any;
    }): any[];
}

declare function getVivId(id: any): string;
/**
 * Create an initial view state that centers the image in the viewport at the zoom level that fills the dimensions in `viewSize`.
 * @param {Object} loader (PixelSource[] | PixelSource)
 * @param {Object} viewSize { height, width } object giving dimensions of the viewport for deducing the right zoom level to center the image.
 * @param {Object=} zoomBackOff A positive number which controls how far zoomed out the view state is from filling the entire viewport (default is 0 so the image fully fills the view).
 * SideBySideViewer and PictureInPictureViewer use .5 when setting viewState automatically in their default behavior, so the viewport is slightly zoomed out from the image
 * filling the whole screen.  1 unit of zoomBackOff (so a passed-in value of 1) corresponds to a 2x zooming out.
 * @param {Boolean=} use3d Whether or not to return a view state that can be used with the 3d viewer
 * @param {Boolean=} modelMatrix If using a transformation matrix, passing it in here will allow this function to properly center the volume.
 * @returns {Object} A default initial view state that centers the image within the view: { target: [x, y, 0], zoom: -zoom }.
 */
declare function getDefaultInitialViewState(loader: Object, viewSize: Object, zoomBackOff?: Object | undefined, use3d?: boolean | undefined, modelMatrix?: boolean | undefined): Object;

export { DETAIL_VIEW_ID, DetailView, OVERVIEW_VIEW_ID, OverviewView, SideBySideView, VivView, VolumeView, getDefaultInitialViewState, getVivId };
