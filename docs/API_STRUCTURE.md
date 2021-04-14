### API Structure

#### Viewer

Viv provides four high-level React components called "Viewers": `PictureInPictureViewer`,
`SideBySideViewer`, `VolumeViewer` and `VivViewer`. The first three wrap the `VivViewer` and use the `View` API for composing different layouts.
`VivViewer` wraps a [`DeckGL` component](https://deck.gl/#/documentation/deckgl-api-reference/deck) and handles
managing the complex state (i.e multiple "views" in the same scene) as well as
resizing and forwarding rendering `props` down to the underling layers via the `View` API.

#### View

A "View" in Viv is a wrapper around a deck.gl 
[View](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view)
that exposes an API to manage where an image is rendered in the coordinate space. A `View`
must inherit from a `VivView` and implement:

- 1.) a filter for updating [`ViewState`](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view-state)
- 2.) a method for instantiating a [`View`](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view)
- 3.) a method for rendering [`Layers`](https://deck.gl/#/documentation/developer-guide/using-layers)

Views are used by Viv's `Viewer` components. For example, the `OverviewView` is used in the 
`PictureInPictureViewer` to provide a constant overview of the high resolution image. The 
`SideBySideView` has supports locked and unlocked zoom/pan interactions within 
the `SideBySideViewer`.

#### Layer

Viv implements several deck.gl
[`Layers`](https://deck.gl/#/documentation/developer-guide/using-layers),
for rending RGB and multi-channel imaging data. These layers can be composed like any other
layer in the deck.gl ecosystem. The main three layers for use are `MultiscaleImageLayer` (for tiled, pyramidal images),
`ImageLayer` (for non-pyramidal and non-tiled iamges), and `VolumeLayer` (for volumetric ray casting rendering)
which accept `PixelSource` arguments for data fetching.  These layers handle the complexity of data fetching
and setting up the rendering by wrapping the `XRLayer`, `XR3DLayer` and `BitmapLayer`, which are the lower level rendering layers.  
The `XRLayer` (eXtended Range Layer) and `XR3DLayer` enable multi-channel additive blending of `Uint32`, `Uint16`, `Uint8` and `Float32` data on the GPU. 

#### Loader (Pixel Sources)

Viv wraps both Tiff- and Zarr-based data sources in a unified `PixelSource` interface. A pixel
source can be thought of as a multi-dimensional "stack" of image data with labeled 
dimensions (usually `["t", "c", "z", "y", "x"]`). A multiscale image is represented as list
of pixel sources decreasing in shape. Viv provides several helper functions to intialize a 
loader via url: `loadOmeTiff`, `loadBioformatsZarr`, and `loadOmeZarr`. Each function returns a
`Promise` for an object of shape `{ data: PixelSouce[], metadata: M }`, where `M` is a JavaScript
object containing the format-specific metadata for the image. For OME-TIFF and Bioformats-Zarr,
the metadata is identical (OME-XML representation), for OME-Zarr, the metadata is that for a
multiscale group (more information: https://ngff.openmicroscopy.org/latest/). This metadata 
can be useful for creating UI componenets that describe the data source.