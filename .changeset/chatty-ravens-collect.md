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

**This release includes backward-incompatible changes**. To avoid automatically adopting such releases, ensure you are either pinning the exact version of `@hms-dbmi/viv` in your `package.json` file or using a version range syntax that only accepts patch updates, such as `~0.16.1`. Refer to npm's [semver documentation](https://docs.npmjs.com/cli/v6/using-npm/semver/) for details.

    Migrate to deck.gl v9

This update modifies our code internally to support deck.gl v9, dropping compatibility with deck.gl v8. See the [release notes](https://deck.gl/docs/whats-new#deckgl-v90) to learn more.

**Impact**:

We haven’t changed Viv's public API, but the upgrade to deck.gl 9.0 is considered **breaking** due to changes in its dependencies, which may require updates to WebGL-related code (e.g., shaders, injections, constants). Here are potential issues users may face in migrating:

    - deprecating WebGL1
    - changing any public-facing GL-specific variables to use the new luma.gl backend-agnostic variables (such as `interpolation` on the `ImageLayer`)
    - shader injection-location name changes (i.e., `gl_fragColor` -> `fragColor`)

**Action**:

   - You will need to upgrade to deck.gl `9.0.x` if you use it directly as having multiple versions of deck.gl is not supported. The above list only includes changes internally to Viv and is not an exhaustive summary of all changes required for our migration. For full details on upgrading to deck.gl `9.0.x`, please refer to the [upgrade guide](https://deck.gl/docs/upgrade-guide#upgrading-to-v90).
    - Pin a specific Viv version or semver range to prevent unintended updates.
