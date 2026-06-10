---
"@vivjs/viewers": minor
"@vivjs/layers": minor
"@vivjs/views": minor
"@vivjs/constants": minor
"@vivjs/extensions": minor
"@vivjs/loaders": minor
"@hms-dbmi/viv": minor
"@vivjs/types": minor
---

Update to latest versions of deck.gl and luma.gl, with fixes for regressions in side-by-side and picture-in-picture related to deck.gl viewState handling changes.

Removed randomize prop from VivViewer which was no longer necessary and caused glitches in view composition particularly noticeable in avivator with scalebar views in side-by-side mode, but which could also have caused problems for downstream apps.
