---
"@vivjs/layers": patch
---

Place partial (edge) tiles in MultiscaleImageLayer at their true footprint instead of snapping them to the full image extent. The old bounds assumed every pyramid level was an exact halving of its parent; on a floor-halved pyramid (level k spanning size_k * 2\*\*k, up to 2\*\*k - 1 px short of the base) they over-scaled the right-column and bottom-row tiles by a level-dependent amount, so the image shifted slightly in x/y as tiles of different levels were drawn. Full tiles are unaffected, as are exactly-halving pyramids.
