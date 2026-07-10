const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');

/**
 * Metro configuration — SPEC-070-B P1.
 *
 * The SDK source lives one directory up (`file:..`), so Metro must be told to watch it and to
 * resolve `react` / `react-native` from THIS example's node_modules rather than the parent's. Without
 * the watch, edits to the SDK's TypeScript would not hot-reload; without pinning the peer deps to a
 * single copy, Metro would find two `react` instances (the example's and the package's dev copy) and
 * throw "Invariant Violation: Invalid hook call".
 *
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    // One copy of each shared/peer dependency, taken from the example. Two copies of `react` is the
    // classic broken-hooks crash in a local-library example.
    extraNodeModules: {
      react: path.join(__dirname, 'node_modules', 'react'),
      'react-native': path.join(__dirname, 'node_modules', 'react-native'),
      [pkg.name]: root,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
