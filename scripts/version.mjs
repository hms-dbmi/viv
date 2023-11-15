import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

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

function preChanglog(){
  const entries = fs.readdirSync(path.resolve(__dirname, '../.changeset'));
  for (const file of entries) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const filePath = path.resolve(__dirname, '../.changeset', file);
    const changeset = matter.read(filePath);
    changeset.data = { [mainPackage]: getGreatestBumpType(changeset) };
    changeset.content = updateContentsWithAffectedPackages(changeset);
    fs.writeFileSync(filePath, matter.stringify(changeset.content, changeset.data));
  }
}
