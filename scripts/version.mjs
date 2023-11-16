import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as childProcess from 'node:child_process';

import matter from 'gray-matter';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const mainPackage = "@hms-dbmi/viv";

/**
 * @param {matter.GrayMatterFile<string>} changeset
 */
function getGreatestBumpType(changeset) {
  const BUMP_TYPES = /** @type {const} */ (['none', 'patch', 'minor', 'major']);
  const versions = Object.values(changeset.data).map(v => BUMP_TYPES.indexOf(v));
  const bumpType = BUMP_TYPES[Math.max(...versions)];
  if (!bumpType) {
    throw new Error(`Invalid bump type: ${bumpType}`);
  }
  return bumpType;
}

/**
 * Appends the package names to the second line of the changeset content.
 * @param {matter.GrayMatterFile<string>} changeset
 */
function updateContentsWithAffectedPackages(changeset) {
  const contentLines = changeset.content.split('\n');
  const packageInfo = Object.keys(changeset.data).map(name => `\`${name}\``).join(', ');
  contentLines[1] = `${contentLines[1]} (${packageInfo})`;
  return contentLines.join('\n');
}

/**
 * Collects all the changesets (for all packages) and collects
 * them into a single changeset for the main package.
 *
 * For example:
 *
 * ```md
 * ---
 *  "@vivjs/loaders": minor
 *  "@vivjs/constants": patch
 * ---
 *
 *  Fixes a bug in loaders.
 * ```
 *
 * becomes:
 *
 * ```md
 * ---
 *  "@hms-dbmi/viv": minor
 * ---
 *  Fixes a bug in loaders. (`@vivjs/loaders`, `@vivjs/constants`)
 * ```
 *
 */
async function preChangesetsVersion(){
  const entries = fs.readdirSync(path.resolve(__dirname, '../.changeset'));
  for (const file of entries) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const filePath = path.resolve(__dirname, '../.changeset', file);
    const changeset = matter.read(filePath);
    changeset.content = updateContentsWithAffectedPackages(changeset);
    changeset.data = { [mainPackage]: getGreatestBumpType(changeset) };
    fs.writeFileSync(filePath, matter.stringify(changeset.content, changeset.data));
  }
}

/**
 * Reads the main package's changelog and removes all the dependency
 * updates for individual packages.
 *
 * Deletes all the other changelogs.
 */
async function postChangesetsVersion() {
  const contents = fs.readFileSync(
    path.resolve(__dirname, '..', 'packages', 'main', 'CHANGELOG.md'),
    { encoding: 'utf-8' }
  );
  const lines = contents.split('\n');
  const newChangelog = lines
    .filter(line => !line.startsWith('  - @vivjs/')) // remove dependency updates
    .join('\n');
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'packages', 'main', 'CHANGELOG.md'),
    newChangelog,
  );

  for (const pkg of fs.readdirSync(path.resolve(__dirname, "../packages"))) {
    if (pkg === "main") {
      continue;
    }
    fs.unlinkSync(path.resolve(__dirname, "../packages", pkg, "CHANGELOG.md"));
  }

  for (const pkg of fs.readdirSync(path.resolve(__dirname, "../sites"))) {
    fs.unlinkSync(path.resolve(__dirname, "../sites", pkg, "CHANGELOG.md"));
  }
}

await preChangesetsVersion();
childProcess.execSync('pnpm changeset version');
await postChangesetsVersion();
