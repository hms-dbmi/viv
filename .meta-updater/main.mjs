const DECK_VERSION = '~8.8.6';
const LUMAGL_VERSION = '~8.5.16';
const MATHGL_VERSION = '^3.5.7';
const REACT_VERSION = '^16.8.0 || ^17.0.0';


/** @typedef {import('@pnpm/types').PackageManifest} PackageManifest */

/**
 * Mutates package metadata in-place to pin specific package versions.
 *
 * @param {PackageManifest} manifest
 */
function pinVersions(manifest) {
  for (let key of /** @type {const} */ (['dependencies', 'devDependencies', 'peerDependencies'])) {
    let deps = manifest[key] ?? {};
    for (let name of Object.keys(deps)) {
      if (name.startsWith('@deck.gl/') || name === 'deck.gl') {
        deps[name] = DECK_VERSION;
      }
      if (name.startsWith('@luma.gl/') || name === 'luma.gl') {
        deps[name] = LUMAGL_VERSION;
      }
      if (name.startsWith('@math.gl/')) {
        deps[name] = MATHGL_VERSION;
      }
      if (name === 'react' || name === 'react-dom') {
        deps[name] = REACT_VERSION;
      }
    }
  }
}

export default (/** @type {string} */ _workspaceDir) => {
  return {
    'package.json': (
      /** @type {PackageManifest} */ manifest,
      /** @type {string} */ _dir
    ) => {
      // Only pin deps in @vivjs/*. Avivator should manually update.
      if (manifest.name?.includes('@vivjs')) {
        pinVersions(manifest);
      }
      return manifest;
    }
  };
};
