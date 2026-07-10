const path = require('path');
const pkg = require('../package.json');

/**
 * SPEC-070-B P1 — stop `use_native_modules!` from walking into an infinite loop.
 *
 * The example depends on the SDK via `"@appdna-ai/react-native-sdk": "file:.."`, which symlinks
 * `node_modules/@appdna-ai/react-native-sdk` back to the package root — and the package root
 * *contains* this `example/` directory. `pod install` runs `use_native_modules!`, which shells out to
 * `@react-native-community/cli config` to auto-discover native modules by walking `node_modules`.
 * With that self-referential symlink the walk recurses example → package → example → … and never
 * returns; `pod install` sits on `config = use_native_modules!` forever.
 *
 * Declaring the dependency's `root` explicitly is what `react-native-builder-bob` scaffolds for a
 * local-library example precisely to avoid this: the CLI resolves the one local native module from
 * this entry instead of discovering it by traversal, so there is no loop to fall into.
 */
module.exports = {
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '..'),
    },
  },
};
