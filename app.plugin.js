/**
 * SPEC-070-B D-q / D-q1 — Expo config plugin for @appdna-ai/react-native-sdk.
 *
 * Floor: **Expo SDK 52**. ⚠ SDK 52 pins React Native 0.76 exactly, and no Expo SDK ships RN 0.77 or
 * 0.78 (SDK 53 starts at 0.79). The `0.76.4–0.77.x` band in D-c is bare-RN only.
 *
 * ## What this plugin must do, and what it must not
 *
 * **Android: nothing.** The SDK's library `AndroidManifest.xml` auto-merges into the host. A plugin
 * that also wrote application-level attributes would break manifest-merge for any app declaring its
 * own — which is exactly why the wrapper's manifest is empty.
 *
 * **iOS: three things**, none of which Expo's defaults give you:
 *   1. `deploymentTarget → 16.0`. The core pod requires it (`AppDNASDK.podspec:15`); Expo 52
 *      defaults to 15.1, and CocoaPods resolves the floor, so the build fails at `pod install`.
 *   2. Firebase must link **statically**. The SDK depends on FirebaseFirestore; with Expo's default
 *      dynamic frameworks, Firebase's transitive static deps produce duplicate-symbol errors.
 *   3. Push entitlements — **only if the app uses push**. `AppDNA.swift:642` calls
 *      `registerForRemoteNotifications()`, so an app without `aps-environment` gets a runtime
 *      registration failure rather than a build error.
 *
 * @param {import('@expo/config-types').ExpoConfig} config
 * @param {{ enablePush?: boolean, deploymentTarget?: string }} [props]
 */
const DEFAULT_DEPLOYMENT_TARGET = '16.0';

/** @type {(cfg: any, props?: any) => any} */
const withAppDNA = (config, props = {}) => {
  const {
    withPodfileProperties,
    withEntitlementsPlist,
    withInfoPlist,
    createRunOncePlugin,
  } = require('@expo/config-plugins');

  const deploymentTarget = props.deploymentTarget ?? DEFAULT_DEPLOYMENT_TARGET;
  const enablePush = props.enablePush ?? false;

  // (1) + (2): both land in Podfile.properties.json, which `expo prebuild` reads.
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults['ios.deploymentTarget'] = deploymentTarget;
    cfg.modResults['ios.useFrameworks'] = 'static';
    return cfg;
  });

  if (enablePush) {
    // (3a) APNs environment. `expo prebuild` writes this into the .entitlements file.
    config = withEntitlementsPlist(config, (cfg) => {
      cfg.modResults['aps-environment'] =
        cfg.modResults['aps-environment'] ?? 'development';
      return cfg;
    });

    // (3b) Background delivery of silent pushes.
    config = withInfoPlist(config, (cfg) => {
      const modes = new Set(cfg.modResults.UIBackgroundModes ?? []);
      modes.add('remote-notification');
      cfg.modResults.UIBackgroundModes = [...modes];
      return cfg;
    });
  }

  // The SDK's BGTaskScheduler identifier. Registering a background task whose id is absent here is
  // an immediate NSInternalInconsistencyException at launch — not a degraded feature.
  config = withInfoPlist(config, (cfg) => {
    const ids = new Set(cfg.modResults.BGTaskSchedulerPermittedIdentifiers ?? []);
    ids.add('ai.appdna.sdk.eventUpload');
    cfg.modResults.BGTaskSchedulerPermittedIdentifiers = [...ids];
    return cfg;
  });

  return createRunOncePlugin(
    (c) => c,
    '@appdna-ai/react-native-sdk',
    require('./package.json').version,
  )(config);
};

module.exports = withAppDNA;
