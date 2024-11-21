---
"@vivjs/constants": minor
"@vivjs/extensions": minor
"@vivjs/layers": minor
"@vivjs/loaders": minor
"@hms-dbmi/viv": minor
"@vivjs/types": minor
"@vivjs/viewers": minor
"@vivjs/views": minor
---

(chore): upgrade deck.gl + luma.gl to the `9.0.x` versions.  There should be no public API changes from this except the version bump, and what these new versions require "internally":

- deprecating WebGL1
- changing any public-facing GL-specific variables to use the new luma.gl backend-agnostic variables (such as `interpolation` on the `ImageLayer`)
- shader injection-location name changes (i.e., `gl_fragColor` -> `fragColor`)
