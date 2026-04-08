import * as _deck_gl_core from '@deck.gl/core';
import { LayerExtension } from '@deck.gl/core';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {boolean=} useTransparentColor Indicates whether the shader should make the output of colormap_function(0) color transparent
 * */
declare const AdditiveColormapExtension: {
    new (opts?: any): {
        getShaders(): {
            modules: {
                name: string;
                fs: string;
                inject: {
                    'fs:DECKGL_MUTATE_COLOR': string;
                };
            }[];
        };
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        draw(): void;
        opts: any;
        equals(extension: LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colormap: {
            type: string;
            value: string;
            compare: boolean;
        };
        opacity: {
            type: string;
            value: number;
            compare: boolean;
        };
        useTransparentColor: {
            type: string;
            value: boolean;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * @property {number=} opacity Opacity of the layer.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * @property {Boolean=} useTransparentColor Whether or not to use the value provided to transparentColor.
 */
declare const ColorPaletteExtension: {
    new (opts?: any): {
        getShaders(): any;
        draw(): void;
        opts: any;
        equals(extension: LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
        opacity: {
            type: string;
            value: number;
            compare: boolean;
        };
        transparentColor: {
            type: string;
            value: null;
            compare: boolean;
        };
        useTransparentColor: {
            type: string;
            value: boolean;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for a lens that selectively shows one channel in its chosen color and then the others in white.
 * @typedef LayerProps
 * @type {Object}
 * @property {boolean=} lensEnabled Whether or not to use the lens.
 * @property {number=} lensSelection Numeric index of the channel to be focused on by the lens.
 * @property {number=} lensRadius Pixel radius of the lens (default: 100).
 * @property {Array.<number>=} lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @property {number=} lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @property {Array<Array.<number>>=} colors Color palette to pseudo-color channels as.
 * */
declare const LensExtension: {
    new (opts?: any): {
        getShaders(): any;
        initializeState(): void;
        draw(): void;
        finalizeState(): void;
        opts: any;
        equals(extension: LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
    };
    extensionName: string;
    defaultProps: {
        lensEnabled: {
            type: string;
            value: boolean;
            compare: boolean;
        };
        lensSelection: {
            type: string;
            value: number;
            compare: boolean;
        };
        lensRadius: {
            type: string;
            value: number;
            compare: boolean;
        };
        lensBorderColor: {
            type: string;
            value: number[];
            compare: boolean;
        };
        lensBorderRadius: {
            type: string;
            value: number;
            compare: boolean;
        };
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * */
declare const BaseExtension$1: {
    new (...args: any[]): {
        opts: any;
        getShaders(): any;
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        equals(extension: LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colormap: {
            type: string;
            value: string;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Additive Blending in 3D.
 * */
declare const AdditiveBlendExtension$1: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        getShaders(): any;
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colormap: {
            type: string;
            value: string;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Maximum Intensity Projection in 3D.
 */
declare const MaximumIntensityProjectionExtension$1: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        getShaders(): any;
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colormap: {
            type: string;
            value: string;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Minimum Intensity Projection in 3D.
 */
declare const MinimumIntensityProjectionExtension$1: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        getShaders(): any;
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colormap: {
            type: string;
            value: string;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

declare namespace AdditiveColormap3DExtensions {
    export { BaseExtension$1 as BaseExtension };
    export { AdditiveBlendExtension$1 as AdditiveBlendExtension };
    export { MaximumIntensityProjectionExtension$1 as MaximumIntensityProjectionExtension };
    export { MinimumIntensityProjectionExtension$1 as MinimumIntensityProjectionExtension };
}

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * */
declare const BaseExtension: {
    new (...args: any[]): {
        opts: any;
        draw(): void;
        equals(extension: LayerExtension<any>): boolean;
        getShaders(this: _deck_gl_core.Layer, extension: /*elided*/ any): any;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with additive blending.
 * */
declare const AdditiveBlendExtension: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        draw(): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getShaders(this: _deck_gl_core.Layer, extension: /*elided*/ any): any;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Maximum Intensity Projection.
 * */
declare const MaximumIntensityProjectionExtension: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        draw(): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getShaders(this: _deck_gl_core.Layer, extension: /*elided*/ any): any;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Minimum Intensity Projection.
 * */
declare const MinimumIntensityProjectionExtension: {
    new (args: any): {
        rendering: {
            _BEFORE_RENDER: string;
            _RENDER: string;
            _AFTER_RENDER: string;
        };
        opts: any;
        draw(): void;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getShaders(this: _deck_gl_core.Layer, extension: /*elided*/ any): any;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        finalizeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
    };
    extensionName: string;
    defaultProps: {
        colors: {
            type: string;
            value: null;
            compare: boolean;
        };
    };
    readonly componentName: string;
};

declare namespace ColorPalette3DExtensions {
    export { BaseExtension };
    export { AdditiveBlendExtension };
    export { MaximumIntensityProjectionExtension };
    export { MinimumIntensityProjectionExtension };
}

export { AdditiveColormap3DExtensions, AdditiveColormapExtension, ColorPalette3DExtensions, ColorPaletteExtension, LensExtension };
