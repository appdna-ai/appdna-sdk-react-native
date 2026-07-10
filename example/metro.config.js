const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration.
 *
 * The SDK is installed into node_modules as a real directory (`.npmrc` install-links), so the default
 * resolver finds it with no help. Do NOT point Metro or autolinking back at `../` — that directory is
 * the SDK source and contains this `example/`, and walking it is the cycle that hangs `pod install`.
 *
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
