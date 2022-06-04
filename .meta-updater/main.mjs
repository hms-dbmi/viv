import * as fs from 'fs';
import * as path from 'node:path';

const DECK_VERSION = '8.6.7';
const LUMAGL_VERSION = '8.5.3';
const MATHGL_VERSION = '^3.5.7';
const REACT_VERSION = '^16.8.0 || ^17.0.0';

// Mutates package metadata in place
function pinVersions(deps = {}) {
  for (let name of Object.keys(deps)) {
    if (name.startsWith('@deck.gl/')) {
      deps[name] = DECK_VERSION;
    }
    if (name.startsWith('@luma.gl/')) {
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

export default (workspaceDir) => {
  let root = path.resolve(workspaceDir, 'package.json');
  let meta = JSON.parse(fs.readFileSync(root, { encoding: 'utf-8' }));
  return {
    'package.json': (manifest, dir) => {
      pinVersions(manifest.dependencies);
      pinVersions(manifest.devDependencies);
      pinVersions(manifest.peerDependencies);
      return { ...manifest, version: meta.version };
    },
  }
}
