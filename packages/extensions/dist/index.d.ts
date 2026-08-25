import * as _deck_gl_core from '@deck.gl/core';
import { Layer, LayerExtension } from '@deck.gl/core';
import { ShaderModule, ShaderAssembler } from '@luma.gl/shadertools';

/**
 * Interface for Viv layers that support dynamic channel and plane counts.
 * Layers implementing this interface must provide methods to query their
 * actual channel/plane counts at runtime.
 */
interface VivLayer extends Layer {
    /**
     * Returns the number of channels for this layer instance.
     * Should be based on actual data (e.g., selections.length), not MAX_CHANNELS.
     */
    getNumChannels(): number;
    /**
     * Returns the number of planes for this layer instance.
     * Defaults to 1 for 2D layers, or clippingPlanes.length for 3D layers.
     */
    getNumPlanes(): number;
}
/**
 * Expands a shader module's uniformTypes and shader code to include per-channel and per-plane declarations.
 * This is mostly an internal implementation detail used by `VivLayer` implementations, it's not expected that
 * extensions should call it directly.
 * Any uniformType key containing VIV_CHANNEL_INDEX_PLACEHOLDER will be expanded (we tend to import this `as I`).
 * Any uniformType key containing VIV_PLANE_INDEX_PLACEHOLDER will be expanded.
 * Any shader code (fs/vs) containing these placeholders will be expanded.
 * Required for per-channel/per-plane uniforms because counts vary at runtime.
 *
 * Defines: NUM_CHANNELS and NUM_PLANES are always set on the expanded module. When multiple modules
 * supply defines, the shader assembler (luma.gl) merges them; conflict resolution order is
 * implementation-dependent (typically object spread, so later wins). Viv layers use
 * `expandShaderModule(super.getShaders(...), numChannels, numPlanes)` so the top-level descriptor
 * has these defines in one place.
 *
 *
 * @param module - Shader module definition
 * @param numChannels - Number of channels to expand
 * @param numPlanes - Number of planes to expand (default: 1)
 * @returns Expanded shader module with per-channel/per-plane uniformTypes and shader code
 *
 * @example
 * import { VIV_CHANNEL_INDEX_PLACEHOLDER as I } from '@vivjs/constants';
 * const module = {
 *   name: 'my-module',
 *   uniformTypes: {
 *     [`color${I}`]: 'vec3<f32>'
 *   },
 *   fs: `uniform myUniforms {
 *     // note that with the current implementation it is important that statements needing expansion appear on their own line
 *     vec3 color${I};
 *   } my;`
 * };
 * const expanded = expandShaderModule(module, 3);
 * // expanded.uniformTypes = { color0: 'vec3<f32>', color1: 'vec3<f32>', color2: 'vec3<f32>' }
 * // expanded.fs = `uniform myUniforms {
 * //   // note that with the current implementation it is important that statements needing expansion appear on their own line
 * //   vec3 color0;
 * //   vec3 color1;
 * //   vec3 color2;
 * // } my;`
 */
declare function expandShaderModule(module: ShaderModule, numChannels: number, numPlanes?: number): ShaderModule;
/**
 * This class is used internally by `VivLayer`s to avoid problems with other normal deck.gl layers (in particular,
 * `PolygonLayer`s used in `overview-layer`) that lack defines for `NUM_CHANNELS` which is part of the declared signature
 * of Viv's hooks. This leads to shader compiler errors when these layers are used.
 *
 * Registering viv-specific hooks here also reduces the places in which we break encapsulation of `ShaderAssembler`.
 */
declare class VivShaderAssembler extends ShaderAssembler {
    static _default: VivShaderAssembler;
    constructor();
    static getDefaultVivShaderAssembler(): VivShaderAssembler;
}
/**
 * Base class for Viv-specific layer extensions.
 *
 * Responsibilities:
 * - Extensions implement `getVivShaderTemplates` and return shader *templates* (with placeholders)
 * - `VivLayerExtension.getShaders`:
 *   - Is called with `this` bound to the layer instance and `extension` as the extension instance
 *     (this is similar to the pattern used by deck.gl more generally)
 *   - Expands shader modules (uniformTypes + fs/vs) using `expandShaderModule` when any part of
 *     the system calls `getShaders()`
 */
declare abstract class VivLayerExtension<OptionsT = unknown> extends LayerExtension<OptionsT> {
    static extensionName: string;
    /**
     * Extensions must implement this to return shader *templates* (with placeholders),
     * not expanded modules.
     */
    abstract getVivShaderTemplates(): ReturnType<LayerExtension['getShaders']>;
    /**
     * deck.gl calls this as `extension.getShaders.call(layer, extension)`.
     * `this` is therefore the layer, and `extension` is the extension instance.
     */
    getShaders(this: VivLayer, extension: this): ReturnType<LayerExtension['getShaders']>;
}

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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                uniformTypes: {
                    opacity: string;
                    useTransparentColor: string;
                };
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
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        opts: any;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                uniformTypes: {
                    transparentColor: string;
                    useTransparentColor: string;
                    opacity: string;
                    colorVIV_CHANNEL_INDEX: string;
                };
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
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        opts: any;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                uniformTypes: {
                    majorLensAxis: string;
                    minorLensAxis: string;
                    lensCenter: string;
                    lensEnabled: string;
                    lensSelection: string;
                    lensBorderColor: string;
                    lensBorderRadius: string;
                    colorVIV_CHANNEL_INDEX: string;
                };
                fs: string;
                inject: {
                    'fs:DECKGL_MUTATE_COLOR': string;
                    'fs:#main-end': string;
                };
            }[];
        };
        initializeState(): void;
        draw(): void;
        finalizeState(): void;
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        opts: any;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                fs: string;
            }[];
        };
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                fs: string;
            }[];
        };
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                fs: string;
            }[];
        };
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {
            modules: {
                name: string;
                fs: string;
            }[];
        };
        updateState({ props, oldProps, changeFlags, ...rest }: {
            [x: string]: any;
            props: any;
            oldProps: any;
            changeFlags: any;
        }): void;
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {};
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {};
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {};
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
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
    get componentName(): string;
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
        getVivShaderTemplates(): {};
        getShaders(this: VivLayer, extension: /*elided*/ any): ReturnType<_deck_gl_core.LayerExtension["getShaders"]>;
        equals(extension: _deck_gl_core.LayerExtension<any>): boolean;
        getSubLayerProps(this: _deck_gl_core.CompositeLayer, extension: /*elided*/ any): any;
        initializeState(this: _deck_gl_core.Layer, context: _deck_gl_core.LayerContext, extension: /*elided*/ any): void;
        updateState(this: _deck_gl_core.Layer, params: _deck_gl_core.UpdateParameters<_deck_gl_core.Layer>, extension: /*elided*/ any): void;
        onNeedsRedraw(this: _deck_gl_core.Layer, extension: /*elided*/ any): void;
        getNeedsPickingBuffer(this: _deck_gl_core.Layer, extension: /*elided*/ any): boolean;
        draw(this: _deck_gl_core.Layer, params: any, extension: /*elided*/ any): void;
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
    get componentName(): string;
};

declare namespace ColorPalette3DExtensions {
    export { BaseExtension };
    export { AdditiveBlendExtension };
    export { MaximumIntensityProjectionExtension };
    export { MinimumIntensityProjectionExtension };
}

/** @param {number} n */
declare function getDefaultPalette(n: number): undefined[];
/** @param {{ colors: Color[], channelsVisible: boolean[] }} */
declare function padColors({ colors, channelsVisible }: {
    colors: Color[];
    channelsVisible: boolean[];
}): any[];
/**
 * Pad colors for UBO (Uniform Buffer Objects) - returns array of vec3 arrays
 * @param {{ colors: Color[], channelsVisible: boolean[] }}
 * @returns {Color[]} Array of [r,g,b] arrays, normalized to 0-1 range
 */
declare function padColorsForUBO({ colors, channelsVisible }: {
    colors: Color[];
    channelsVisible: boolean[];
}): Color[];
type Color = undefined;

export { AdditiveColormap3DExtensions, AdditiveColormapExtension, ColorPalette3DExtensions, ColorPaletteExtension, LensExtension, VivLayerExtension, VivShaderAssembler, expandShaderModule, getDefaultPalette, padColors, padColorsForUBO };
export type { VivLayer };
