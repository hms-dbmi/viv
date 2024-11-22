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

This update modifies our code internally to support deck.gl v9, dropping compatibility with deck.gl v8.

Impact:

We have not made any public API changes from this except the version bump, and what these new versions require "internally" to your GL related code:

    - deprecating WebGL1
    - changing any public-facing GL-specific variables to use the new luma.gl backend-agnostic variables (such as `interpolation` on the `ImageLayer`)
    - shader injection-location name changes (i.e., `gl_fragColor` -> `fragColor`)

Action:

    - You will need to upgrade to deck.gl `9.0.x` if it is specified separately or you use other `deck.gl` functionality indpendently of Viv as having two versions is not supported.  The above list of "internally" changing APIs was not exhaustive and only covers the Viv-related changes.  Please see https://deck.gl/docs/upgrade-guide#upgrading-to-v90 for more information.
    - Pin a specific Viv version or semver range to prevent unintended updates.
