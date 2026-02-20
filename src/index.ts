import { NativeModules, NativeEventEmitter } from 'react-native';
import type {
  WebEntitlement,
  DeferredDeepLink,
  PaywallContext,
  AppDNAEnvironment,
  AppDNAOptions,
} from './types';
import type { Entitlement, PurchaseResult, ProductInfo } from './billing';

export type { WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAEnvironment, AppDNAOptions };
export { AppDNABilling } from './billing';
export type { Entitlement, PurchaseResult, ProductInfo } from './billing';
export { AppDNAPush } from './push';
export type { PushPayload } from './push';

const { AppdnaModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(AppdnaModule);

// MARK: - Delegate / Listener Interfaces (SPEC-041)

/** Delegate for onboarding lifecycle events. */
export interface AppDNAOnboardingDelegate {
  onOnboardingStarted(flowId: string): void;
  onOnboardingStepChanged(flowId: string, stepId: string, stepIndex: number, totalSteps: number): void;
  onOnboardingCompleted(flowId: string, responses: Record<string, unknown>): void;
  onOnboardingDismissed(flowId: string, atStep: number): void;
}

/** Delegate for paywall lifecycle events. */
export interface AppDNAPaywallDelegate {
  onPaywallPresented(paywallId: string): void;
  onPaywallAction(paywallId: string, action: string): void;
  onPaywallPurchaseStarted(paywallId: string, productId: string): void;
  onPaywallPurchaseCompleted(paywallId: string, productId: string, transaction: Record<string, unknown>): void;
  onPaywallPurchaseFailed(paywallId: string, error: string): void;
  onPaywallDismissed(paywallId: string): void;
}

/** Delegate for push notification events. */
export interface AppDNAPushDelegate {
  onPushTokenRegistered(token: string): void;
  onPushReceived(notification: Record<string, unknown>, inForeground: boolean): void;
  onPushTapped(notification: Record<string, unknown>, actionId?: string): void;
}

/** Delegate for billing events. */
export interface AppDNABillingDelegate {
  onPurchaseCompleted(productId: string, transaction: Record<string, unknown>): void;
  onPurchaseFailed(productId: string, error: string): void;
  onEntitlementsChanged(entitlements: Entitlement[]): void;
  onRestoreCompleted(restoredProducts: string[]): void;
}

/** Delegate for in-app message events. */
export interface AppDNAInAppMessageDelegate {
  onMessageShown(messageId: string, trigger: string): void;
  onMessageAction(messageId: string, action: string, data?: Record<string, unknown>): void;
  onMessageDismissed(messageId: string): void;
  shouldShowMessage(messageId: string): boolean;
}

/** Delegate for survey events. */
export interface AppDNASurveyDelegate {
  onSurveyPresented(surveyId: string): void;
  onSurveyCompleted(surveyId: string, responses: Array<Record<string, unknown>>): void;
  onSurveyDismissed(surveyId: string): void;
}

/** Delegate for deep link events. */
export interface AppDNADeepLinkDelegate {
  onDeepLinkReceived(url: string, params: Record<string, string>): void;
}

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

  /** Set log verbosity level at runtime. Valid: 'none','error','warning','info','debug'. */
  static setLogLevel(level: string): void {
    AppdnaModule.setLogLevel(level);
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

  /** Set push token. Registers with backend for direct push delivery. */
  static async setPushToken(token: string): Promise<void> {
    return AppdnaModule.setPushToken(token);
  }

  /** Report push permission status. */
  static async setPushPermission(granted: boolean): Promise<void> {
    return AppdnaModule.setPushPermission(granted);
  }

  /** Track push notification delivered (SPEC-030). */
  static async trackPushDelivered(pushId: string): Promise<void> {
    return AppdnaModule.trackPushDelivered(pushId);
  }

  /** Track push notification tapped (SPEC-030). */
  static async trackPushTapped(
    pushId: string,
    action?: string
  ): Promise<void> {
    return AppdnaModule.trackPushTapped(pushId, action);
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

  // MARK: - v1.0 Module Namespaces

  /** Push notification module. */
  static push = {
    setToken: (token: string) => AppdnaModule.setPushToken(token),
    setPermission: (granted: boolean) => AppdnaModule.setPushPermission(granted),
    trackDelivered: (pushId: string) => AppdnaModule.trackPushDelivered(pushId),
    trackTapped: (pushId: string, action?: string) => AppdnaModule.trackPushTapped(pushId, action),
    /** Request push notification permission from the OS. */
    requestPermission: (): Promise<boolean> => AppdnaModule.requestPushPermission(),
    /** Get the current push token. */
    getToken: (): Promise<string | null> => AppdnaModule.getPushToken(),
    /** Set a delegate to receive push notification callbacks. */
    setDelegate: (delegate: AppDNAPushDelegate): void => {
      eventEmitter.addListener('onPushTokenRegistered', (data: { token: string }) =>
        delegate.onPushTokenRegistered(data.token));
      eventEmitter.addListener('onPushReceived', (data: { payload: Record<string, unknown>; inForeground: boolean }) =>
        delegate.onPushReceived(data.payload, data.inForeground));
      eventEmitter.addListener('onPushTapped', (data: { payload: Record<string, unknown>; actionId?: string }) =>
        delegate.onPushTapped(data.payload, data.actionId));
    },
  };

  /** Onboarding module. */
  static onboarding = {
    present: (flowId: string, context?: OnboardingContext) =>
      AppdnaModule.presentOnboarding(flowId, context ?? null),
    /** Set a delegate to receive onboarding lifecycle callbacks. */
    setDelegate: (delegate: AppDNAOnboardingDelegate): void => {
      eventEmitter.addListener('onOnboardingStarted', (data: { flowId: string }) =>
        delegate.onOnboardingStarted(data.flowId));
      eventEmitter.addListener('onOnboardingStepChanged', (data: { flowId: string; stepId: string; stepIndex: number; totalSteps: number }) =>
        delegate.onOnboardingStepChanged(data.flowId, data.stepId, data.stepIndex, data.totalSteps));
      eventEmitter.addListener('onOnboardingCompleted', (data: { flowId: string; responses: Record<string, unknown> }) =>
        delegate.onOnboardingCompleted(data.flowId, data.responses));
      eventEmitter.addListener('onOnboardingDismissed', (data: { flowId: string; atStep: number }) =>
        delegate.onOnboardingDismissed(data.flowId, data.atStep));
    },
  };

  /** Paywall module. */
  static paywall = {
    present: (paywallId: string, context?: PaywallContext) =>
      AppdnaModule.presentPaywall(paywallId, context ?? null),
    /** Set a delegate to receive paywall lifecycle callbacks. */
    setDelegate: (delegate: AppDNAPaywallDelegate): void => {
      eventEmitter.addListener('onPaywallPresented', (data: { paywallId: string }) =>
        delegate.onPaywallPresented(data.paywallId));
      eventEmitter.addListener('onPaywallAction', (data: { paywallId: string; action: string }) =>
        delegate.onPaywallAction(data.paywallId, data.action));
      eventEmitter.addListener('onPaywallPurchaseStarted', (data: { paywallId: string; productId: string }) =>
        delegate.onPaywallPurchaseStarted(data.paywallId, data.productId));
      eventEmitter.addListener('onPaywallPurchaseCompleted', (data: { paywallId: string; productId: string; transaction: Record<string, unknown> }) =>
        delegate.onPaywallPurchaseCompleted(data.paywallId, data.productId, data.transaction));
      eventEmitter.addListener('onPaywallPurchaseFailed', (data: { paywallId: string; error: string }) =>
        delegate.onPaywallPurchaseFailed(data.paywallId, data.error));
      eventEmitter.addListener('onPaywallDismissed', (data: { paywallId: string }) =>
        delegate.onPaywallDismissed(data.paywallId));
    },
  };

  /** Remote config module. */
  static remoteConfig = {
    get: (key: string): Promise<unknown> => AppdnaModule.getRemoteConfig(key),
    refresh: (): Promise<void> => AppdnaModule.refreshConfig(),
    /** Get all remote config values as a map. */
    getAll: (): Promise<Record<string, unknown>> => AppdnaModule.getAllRemoteConfig(),
    /** Register a callback for remote config changes. Returns unsubscribe function. */
    onChanged: (callback: () => void): (() => void) => {
      const sub = eventEmitter.addListener('onRemoteConfigChanged', callback);
      return () => sub.remove();
    },
  };

  /** Feature flags module. */
  static features = {
    isEnabled: (flag: string): Promise<boolean> => AppdnaModule.isFeatureEnabled(flag),
    /** Get the variant value for a feature flag (for multi-variate flags). */
    getVariant: (flag: string): Promise<unknown> => AppdnaModule.getFeatureVariant(flag),
    /** Register a callback for feature flag changes. Returns unsubscribe function. */
    onChanged: (callback: () => void): (() => void) => {
      const sub = eventEmitter.addListener('onFeatureFlagsChanged', callback);
      return () => sub.remove();
    },
  };

  /** Experiments module. */
  static experiments = {
    getVariant: (experimentId: string): Promise<string | null> =>
      AppdnaModule.getExperimentVariant(experimentId),
    isInVariant: (experimentId: string, variantId: string): Promise<boolean> =>
      AppdnaModule.isInVariant(experimentId, variantId),
    /** Get all experiment exposures for the current user. */
    getExposures: (): Promise<Array<Record<string, unknown>>> =>
      AppdnaModule.getExperimentExposures(),
  };

  /** In-app messages module. */
  static inAppMessages = {
    suppressDisplay: (suppress: boolean): Promise<void> =>
      AppdnaModule.suppressMessages(suppress),
    /** Set a delegate to receive in-app message lifecycle callbacks. */
    setDelegate: (delegate: AppDNAInAppMessageDelegate): void => {
      eventEmitter.addListener('onMessageShown', (data: { messageId: string; trigger: string }) =>
        delegate.onMessageShown(data.messageId, data.trigger));
      eventEmitter.addListener('onMessageAction', (data: { messageId: string; action: string; data?: Record<string, unknown> }) =>
        delegate.onMessageAction(data.messageId, data.action, data.data));
      eventEmitter.addListener('onMessageDismissed', (data: { messageId: string }) =>
        delegate.onMessageDismissed(data.messageId));
      eventEmitter.addListener('shouldShowMessage', (data: { messageId: string }) => {
        const result = delegate.shouldShowMessage(data.messageId);
        return result;
      });
    },
  };

  /** Surveys module. */
  static surveys = {
    present: (surveyId: string): Promise<void> => AppdnaModule.presentSurvey(surveyId),
    /** Set a delegate to receive survey lifecycle callbacks. */
    setDelegate: (delegate: AppDNASurveyDelegate): void => {
      eventEmitter.addListener('onSurveyPresented', (data: { surveyId: string }) =>
        delegate.onSurveyPresented(data.surveyId));
      eventEmitter.addListener('onSurveyCompleted', (data: { surveyId: string; responses: Array<Record<string, unknown>> }) =>
        delegate.onSurveyCompleted(data.surveyId, data.responses));
      eventEmitter.addListener('onSurveyDismissed', (data: { surveyId: string }) =>
        delegate.onSurveyDismissed(data.surveyId));
    },
  };

  /** Deep links module. */
  static deepLinks = {
    handleURL: (url: string): Promise<void> => AppdnaModule.handleDeepLink(url),
    /** Set a delegate to receive deep link callbacks. */
    setDelegate: (delegate: AppDNADeepLinkDelegate): void => {
      eventEmitter.addListener('onDeepLinkReceived', (data: { url: string; params?: Record<string, string> }) =>
        delegate.onDeepLinkReceived(data.url, data.params ?? {}));
    },
  };

  /** Billing module namespace. Mirrors AppDNABilling methods for convenience. */
  static billing = {
    /** Get localized product information from the store. */
    getProducts: (productIds: string[]): Promise<ProductInfo[]> =>
      AppdnaModule.getProducts(productIds),
    /** Purchase a product by its store product ID. */
    purchase: (productId: string, offerToken?: string): Promise<PurchaseResult> =>
      AppdnaModule.purchase(productId, offerToken ?? null),
    /** Restore previously purchased products. */
    restorePurchases: (): Promise<Entitlement[]> =>
      AppdnaModule.restorePurchases(),
    /** Check if the user has an active subscription. */
    hasActiveSubscription: (): Promise<boolean> =>
      AppdnaModule.hasActiveSubscription(),
    /** Get all current entitlements for the user. */
    getEntitlements: (): Promise<Entitlement[]> =>
      AppdnaModule.getEntitlements(),
    /** Listen for entitlement changes. Returns unsubscribe function. */
    onEntitlementsChanged: (callback: (entitlements: Entitlement[]) => void): (() => void) => {
      const sub = eventEmitter.addListener('onEntitlementsChanged', callback);
      return () => sub.remove();
    },
    /** Set a delegate to receive billing lifecycle callbacks. */
    setDelegate: (delegate: AppDNABillingDelegate): void => {
      eventEmitter.addListener('onBillingPurchaseCompleted', (data: { productId: string; transaction: Record<string, unknown> }) =>
        delegate.onPurchaseCompleted(data.productId, data.transaction));
      eventEmitter.addListener('onBillingPurchaseFailed', (data: { productId: string; error: string }) =>
        delegate.onPurchaseFailed(data.productId, data.error));
      eventEmitter.addListener('onBillingEntitlementsChanged', (data: { entitlements: Entitlement[] }) =>
        delegate.onEntitlementsChanged(data.entitlements));
      eventEmitter.addListener('onBillingRestoreCompleted', (data: { restoredProducts: string[] }) =>
        delegate.onRestoreCompleted(data.restoredProducts));
    },
  };

  // MARK: - Lifecycle

  /**
   * Shut down the SDK and release resources.
   * On Android this delegates to AppDNA.shutdown(); on iOS this is a no-op.
   */
  static async shutdown(): Promise<void> {
    return AppdnaModule.shutdown();
  }

  /** Get the native SDK version string (e.g. "1.0.0"). */
  static async getSdkVersion(): Promise<string> {
    return AppdnaModule.getSdkVersion();
  }
}

/** Context passed to onboarding flows for dynamic branching. */
export interface OnboardingContext {
  source?: string;
  campaign?: string;
  referrer?: string;
  userProperties?: Record<string, unknown>;
  experimentOverrides?: Record<string, string>;
}
