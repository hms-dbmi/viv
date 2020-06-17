### API Structure

If you are looking to go deeper than just instantiating a `loader` + `PictureInPictureViewer`/`SideBySideViewer` component, this information may be useful - otherwise, hopefully the APIs + docs for those are sufficient (if not, please feel free to open an issue just to ask a question - we will reply!).

#### Viewer

There are 3 "Viewers", although this is something of a naming-overload: `PictureInPictureViewer`, `SideBySideViewer`, and `VivViewer` (React only for now - non-React coming soon). The `VivViewer` serves as the workhorse. It takes as input and handles managing multiple views (for example, the multiple images in the `PictureInPictureViewer`). It also handles resizing and passing `props` down to the [`DeckGL` component](https://deck.gl/#/documentation/deckgl-api-reference/deck). The `PictureInPictureViewer` and `SideBySideViewer` are then higher level functional components that return a `VivViewer` configured with the proper `View`s (see below) of the image(s) to be rendered.

#### View

To manage where in the cooridnate space the image is rendered, we have developed our own wrappers around deck.gl's [Views](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view) to provide a clean API for using the `VivViewer` component and giving some out-of-the-box support for certain things. A `View` must inherit from a `VivView` and implement/override its methods, including a filter for updating [`ViewState`](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view-state), instantiating a [`View`](https://deck.gl/#/documentation/developer-guide/views-and-projections?section=view) , and rendering [`Layers`](https://deck.gl/#/documentation/developer-guide/using-layers) into that `View`. Our `Views` that we have implemented exist to support our components - for example, the `OverviewView` is used in the `PictureInPictureViewer` to provide a constant overview of the high resolution image, including a bounding box for where you are viewing and a border (both implemented as layers). The `SideBySideView` has built-in-support for locked/unlocked zoom/pan in the `SideBySideViewer`.

#### Layer

This is the lowest level of our rendering API. These are deck.gl [`Layers`](https://deck.gl/#/documentation/developer-guide/using-layers) that we use in our `View`s, but can also be used in any way with a `DeckGL` component/`Deck` object. The workhorse is the `XRLayer` (eXtended Range Layer) which handles the actual GPU rendering for the `VivViewerLayer` and `StaticImageLayer`.

#### Loader

Finally, we also export our loaders, `OMETiffLoader`, and `ZarrLoader`, as well as utility functions for creating them, `OMEZarrReader`, `createZarrLoader`, and `createOMETiffLoader`, which expose a simple API to get a loader as opposed to the more complicated API/data structures of the loaders themselves. These loaders are tightly integrated with the rest of the API, providing metadata about the data such as size and resolution when needed.
