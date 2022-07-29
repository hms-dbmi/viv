import * as fs from 'node:fs';
import * as path from 'node:path';

// temporary - @vivjs/* should follow same version of `@hms-dbmi/viv` after we have successfully tested a release.
const VIV_VERSION = '0.12.10-alpha.0';

const DECK_VERSION = '8.6.7';
const LUMAGL_VERSION = '8.5.13';
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

export default (/** @type {string} */ workspaceDir) => {
  let root = path.resolve(workspaceDir, 'package.json');
  /** @type {PackageManifest} */
  let meta = JSON.parse(fs.readFileSync(root, { encoding: 'utf-8' }));
  return {
    'package.json': (
      /** @type {PackageManifest} */ manifest,
      /** @type {string} */ _dir
    ) => {
      const version = manifest.name === '@hms-dbmi/viv' ? VIV_VERSION : meta.version;
      // Only pin deps in @vivjs/*. Avivator should manually update.
      manifest.name?.includes('@vivjs') && pinVersions(manifest);
      return { ...manifest, version };
    }
  };
};
