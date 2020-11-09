bool frag_in_lens_bounds(vec2 lensCenter, vec2 vTexCoord, float majorLensAxis, float minorLensAxis, float lensBorderRadius) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.
  
  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0) < (1.0 - lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 lensCenter, vec2 vTexCoord, float majorLensAxis, float minorLensAxis, float lensBorderRadius) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.0) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.0);
  
  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1.0 && ellipseDistance >= (1.0 - lensBorderRadius);
}