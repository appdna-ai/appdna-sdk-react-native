import { NativeModules, NativeEventEmitter } from 'react-native';
import type {
  WebEntitlement,
  DeferredDeepLink,
  PaywallContext,
  AppDNAEnvironment,
  AppDNAOptions,
} from './types';

export type { WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAEnvironment, AppDNAOptions };
export { AppDNABilling } from './billing';
export type { Entitlement, PurchaseResult, ProductInfo } from './billing';

const { AppdnaModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(AppdnaModule);

/**
 * Main entry point for the AppDNA React Native SDK.
 * Thin wrapper around native iOS/Android SDKs via native modules.
 */
export class AppDNA {
  /** Initialize the SDK. Call once at app startup. */
  static async configure(
    apiKey: string,
    env: AppDNAEnvironment = 'production',
    options?: AppDNAOptions
  ): Promise<void> {
    return AppdnaModule.configure(apiKey, env, options ?? null);
  }

  /** Identify a user. */
  static async identify(
    userId: string,
    traits?: Record<string, unknown>
  ): Promise<void> {
    return AppdnaModule.identify(userId, traits ?? null);
  }

  /** Clear user identity. */
  static async reset(): Promise<void> {
    return AppdnaModule.reset();
  }

  /** Track a custom event. */
  static async track(
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    return AppdnaModule.track(event, properties ?? null);
  }

  /** Force flush all queued events. */
  static async flush(): Promise<void> {
    return AppdnaModule.flush();
  }

  /** Present a paywall. */
  static async presentPaywall(
    id: string,
    context?: PaywallContext
  ): Promise<void> {
    return AppdnaModule.presentPaywall(id, context ?? null);
  }

  /** Present an onboarding flow. */
  static async presentOnboarding(flowId: string): Promise<void> {
    return AppdnaModule.presentOnboarding(flowId);
  }

  /** Get a remote config value. */
  static async getRemoteConfig(key: string): Promise<unknown> {
    return AppdnaModule.getRemoteConfig(key);
  }

  /** Check if a feature flag is enabled. */
  static async isFeatureEnabled(flag: string): Promise<boolean> {
    return AppdnaModule.isFeatureEnabled(flag);
  }

  /** Get the variant assignment for an experiment. */
  static async getExperimentVariant(
    experimentId: string
  ): Promise<string | null> {
    return AppdnaModule.getExperimentVariant(experimentId);
  }

  /** Check if the user is in a specific variant. */
  static async isInVariant(
    experimentId: string,
    variantId: string
  ): Promise<boolean> {
    return AppdnaModule.isInVariant(experimentId, variantId);
  }

  /** Get experiment config value. */
  static async getExperimentConfig(
    experimentId: string,
    key: string
  ): Promise<unknown> {
    return AppdnaModule.getExperimentConfig(experimentId, key);
  }

  /** Set push token. */
  static async setPushToken(token: string): Promise<void> {
    return AppdnaModule.setPushToken(token);
  }

  /** Report push permission status. */
  static async setPushPermission(granted: boolean): Promise<void> {
    return AppdnaModule.setPushPermission(granted);
  }

  /** Set analytics consent. */
  static async setConsent(analytics: boolean): Promise<void> {
    return AppdnaModule.setConsent(analytics);
  }

  // MARK: - Ready

  /**
   * Returns a Promise that resolves when the SDK is fully initialized
   * (config fetched, managers ready). If already ready, resolves immediately.
   * Call after `configure()` to gate any logic that depends on remote config,
   * experiments, feature flags, or deep links.
   */
  static async onReady(): Promise<void> {
    await AppdnaModule.onReady();
  }

  // MARK: - v0.3: Web Entitlements

  /** Get the current web subscription entitlement. */
  static async getWebEntitlement(): Promise<WebEntitlement | null> {
    return AppdnaModule.getWebEntitlement();
  }

  /** Listen for web entitlement changes. Returns unsubscribe function. */
  static onWebEntitlementChanged(
    callback: (entitlement: WebEntitlement | null) => void
  ): () => void {
    const subscription = eventEmitter.addListener(
      'onWebEntitlementChanged',
      callback
    );
    return () => subscription.remove();
  }

  // MARK: - v0.3: Deferred Deep Links

  /** Check for a deferred deep link on first launch. */
  static async checkDeferredDeepLink(): Promise<DeferredDeepLink | null> {
    return AppdnaModule.checkDeferredDeepLink();
  }

  // MARK: - Lifecycle

  /**
   * Shut down the SDK and release resources.
   * On Android this delegates to AppDNA.shutdown(); on iOS this is a no-op.
   */
  static async shutdown(): Promise<void> {
    return AppdnaModule.shutdown();
  }

  /** Get the native SDK version string (e.g. "0.3.0"). */
  static async getSdkVersion(): Promise<string> {
    return AppdnaModule.getSdkVersion();
  }
}
