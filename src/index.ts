import { AppdnaModule, addNativeListener, parseNativeJson } from './nativeModule';
import { registerHostCallback } from './hostCallbacks';
import type {
  WebEntitlement,
  DeferredDeepLink,
  PaywallContext,
  AppDNAEnvironment,
  AppDNAOptions,
} from './types';
import { AppDNABilling } from './billing';
import type { Entitlement, PurchaseResult, ProductInfo } from './billing';
import type {
  AppDNAOnboardingDelegate,
  AppDNAPaywallDelegate,
  AppDNAPushDelegate,
  AppDNABillingDelegate,
  AppDNAInAppMessageDelegate,
  AppDNASurveyDelegate,
  AppDNADeepLinkDelegate,
  AppDNALifecycleDelegate,
} from './generated/delegates';

export type { WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAEnvironment, AppDNAOptions };
export { AppDNABilling } from './billing';
export type { Entitlement, PurchaseResult, ProductInfo } from './billing';
export { AppDNAPush } from './push';
export { AppDNAScreenSlot } from './AppDNAScreenSlot';
export type { AppDNAScreenSlotProps } from './AppDNAScreenSlot';
export type { PushPayload } from './push';

// MARK: - Delegate Interfaces
//
// Re-exported from the codegen'd IR rather than hand-written here. The two used to disagree: this
// file declared a 6-method paywall delegate while `src/lib/sdk-delegates/index.ts` declares 12, so
// `onPaywallRestoreStarted`, `onPaywallRestoreCompleted`, `onPaywallRestoreFailed`,
// `onPostPurchaseDeepLink`, `onPostPurchaseNextStep` and `onPromoCodeSubmit` were unreachable on RN.
// `check:rn-facade-parity` (P6) keeps them equal now, but re-exporting makes drift impossible rather
// than merely detectable.

export type {
  AppDNAOnboardingDelegate,
  AppDNAPaywallDelegate,
  AppDNAPushDelegate,
  AppDNABillingDelegate,
  AppDNAInAppMessageDelegate,
  AppDNASurveyDelegate,
  AppDNADeepLinkDelegate,
  AppDNALifecycleDelegate,
} from './generated/delegates';

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
    return AppdnaModule.configure(apiKey, env, options);
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
    return AppdnaModule.identify(userId, traits);
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
    return AppdnaModule.track(event, properties);
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
    return AppdnaModule.presentPaywall(id, context);
  }

  /**
   * Present an onboarding flow.
   *
   * Resolves `false` when no view controller / activity was available to present from. The old
   * signature discarded that, which is how "the SDK does nothing" gets filed as a bug.
   */
  static async presentOnboarding(flowId: string): Promise<boolean> {
    return AppdnaModule.presentOnboarding(flowId);
  }

  /** Get a remote config value. */
  static async getRemoteConfig(key: string): Promise<unknown> {
    // E2: an unknown-shape value crosses as a JSON string.
    return parseNativeJson<unknown>(await AppdnaModule.getRemoteConfig(key));
  }

  /** Check if a feature flag is enabled. */
  static async isFeatureEnabled(flag: string): Promise<boolean> {
    return AppdnaModule.isFeatureEnabled(flag);
  }

  /** Get the variant assignment for an experiment. */
  static async getExperimentVariant(
    experimentId: string
  ): Promise<string | null> {
    return parseNativeJson<string | null>(await AppdnaModule.getExperimentVariant(experimentId));
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
    return parseNativeJson<unknown>(await AppdnaModule.getExperimentConfig(experimentId, key));
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
    return parseNativeJson<WebEntitlement | null>(await AppdnaModule.getWebEntitlement());
  }

  /** Listen for web entitlement changes. Returns unsubscribe function. */
  static onWebEntitlementChanged(
    callback: (entitlement: WebEntitlement | null) => void
  ): () => void {
    // Native wraps it: an event payload is an object, never a bare value that could itself be null.
    const subscription = addNativeListener<{ entitlement: WebEntitlement | null }>(
      'onWebEntitlementChanged',
      (data) => callback(data.entitlement ?? null),
    );
    return () => subscription.remove();
  }

  // MARK: - v0.3: Deferred Deep Links

  /** Check for a deferred deep link on first launch. */
  static async checkDeferredDeepLink(): Promise<DeferredDeepLink | null> {
    return parseNativeJson<DeferredDeepLink | null>(await AppdnaModule.checkDeferredDeepLink());
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
    getToken: async (): Promise<string | null> =>
      parseNativeJson<string | null>(await AppdnaModule.getPushToken()),
    /** Set a delegate to receive push notification callbacks. */
    setDelegate: (delegate: AppDNAPushDelegate): void => {
      addNativeListener<{ token: string }>('onPushTokenRegistered', (data) =>
        delegate.onPushTokenRegistered(data.token));
      addNativeListener<{ payload: Record<string, unknown>; inForeground: boolean }>('onPushReceived', (data) =>
        delegate.onPushReceived(data.payload, data.inForeground));
      addNativeListener<{ payload: Record<string, unknown>; actionId?: string }>('onPushTapped', (data) =>
        delegate.onPushTapped(data.payload, data.actionId));
    },
  };

  /** Onboarding module. */
  static onboarding = {
    present: (flowId: string, context?: OnboardingContext): Promise<boolean> =>
      AppdnaModule.presentOnboarding(flowId, context),
    /** Set a delegate to receive onboarding lifecycle callbacks. */
    setDelegate: (delegate: AppDNAOnboardingDelegate): void => {
      addNativeListener<{ flowId: string }>('onOnboardingStarted', (data) =>
        delegate.onOnboardingStarted(data.flowId));
      addNativeListener<{ flowId: string; stepId: string; stepIndex: number; totalSteps: number }>('onOnboardingStepChanged', (data) =>
        delegate.onOnboardingStepChanged(data.flowId, data.stepId, data.stepIndex, data.totalSteps));
      addNativeListener<{ flowId: string; responses: Record<string, unknown> }>('onOnboardingCompleted', (data) =>
        delegate.onOnboardingCompleted(data.flowId, data.responses));
      addNativeListener<{ flowId: string; atStep: number }>('onOnboardingDismissed', (data) =>
        delegate.onOnboardingDismissed(data.flowId, data.atStep));
      addNativeListener<{ flowId: string; stepId: string; permissionType: string; granted: boolean }>('onPermissionResult', (data) =>
        delegate.onPermissionResult(data.flowId, data.stepId, data.permissionType, data.granted));

      // §5 — the four hooks native AWAITS. They go on the host-callback channel, not the one-way
      // event channel, because native blocks the onboarding step until JS answers or the timer fires.
      if (delegate.onBeforeStepAdvance) {
        registerHostCallback('onBeforeStepAdvance', (a) =>
          delegate.onBeforeStepAdvance!(
            a.flowId as string, a.fromStepId as string, a.stepIndex as number, a.stepType as string,
            a.responses as Record<string, unknown>, a.stepData as Record<string, unknown> | undefined,
          ));
      }
      if (delegate.onBeforeStepRender) {
        registerHostCallback('onBeforeStepRender', (a) =>
          delegate.onBeforeStepRender!(
            a.flowId as string, a.stepId as string, a.stepIndex as number, a.stepType as string,
            a.responses as Record<string, unknown>,
          ));
      }
      if (delegate.onElementInteraction) {
        registerHostCallback('onElementInteraction', (a) =>
          delegate.onElementInteraction!(
            a.flowId as string, a.stepId as string, a.blockId as string, a.action as string,
            a.value as string | undefined, a.inputValues as Record<string, unknown>,
          ));
      }
      if (delegate.onPermissionRequest) {
        registerHostCallback('onPermissionRequest', (a) =>
          delegate.onPermissionRequest!(a.permissionType as string));
      }
    },
  };

  /** Paywall module. */
  static paywall = {
    present: (paywallId: string, context?: PaywallContext): Promise<void> =>
      AppdnaModule.presentPaywall(paywallId, context),
    /** Set a delegate to receive paywall lifecycle callbacks. */
    setDelegate: (delegate: AppDNAPaywallDelegate): void => {
      addNativeListener<{ paywallId: string }>('onPaywallPresented', (data) =>
        delegate.onPaywallPresented(data.paywallId));
      addNativeListener<{ paywallId: string; action: string }>('onPaywallAction', (data) =>
        delegate.onPaywallAction(data.paywallId, data.action));
      addNativeListener<{ paywallId: string; productId: string }>('onPaywallPurchaseStarted', (data) =>
        delegate.onPaywallPurchaseStarted(data.paywallId, data.productId));
      addNativeListener<{ paywallId: string; productId: string; transaction: Record<string, unknown> }>('onPaywallPurchaseCompleted', (data) =>
        delegate.onPaywallPurchaseCompleted(data.paywallId, data.productId, data.transaction));
      addNativeListener<{ paywallId: string; error: string }>('onPaywallPurchaseFailed', (data) =>
        delegate.onPaywallPurchaseFailed(data.paywallId, data.error));
      addNativeListener<{ paywallId: string }>('onPaywallDismissed', (data) =>
        delegate.onPaywallDismissed(data.paywallId));
      addNativeListener<{ paywallId: string }>('onPaywallRestoreStarted', (data) =>
        delegate.onPaywallRestoreStarted(data.paywallId));
      addNativeListener<{ paywallId: string; restoredProductIds: string[] }>('onPaywallRestoreCompleted', (data) =>
        delegate.onPaywallRestoreCompleted(data.paywallId, data.restoredProductIds));
      addNativeListener<{ paywallId: string; error: string }>('onPaywallRestoreFailed', (data) =>
        delegate.onPaywallRestoreFailed(data.paywallId, data.error));
      addNativeListener<{ paywallId: string; url: string }>('onPostPurchaseDeepLink', (data) =>
        delegate.onPostPurchaseDeepLink(data.paywallId, data.url));
      addNativeListener<{ paywallId: string }>('onPostPurchaseNextStep', (data) =>
        delegate.onPostPurchaseNextStep(data.paywallId));

      // 🔴 The one veto that defaults to REJECT. A host that does not implement it gets the native
      // default, which refuses every code — never the "accept any non-blank string" fallback.
      if (delegate.onPromoCodeSubmit) {
        registerHostCallback('onPromoCodeSubmit', (a) =>
          delegate.onPromoCodeSubmit!(a.paywallId as string, a.code as string));
      }
    },
    /** Present the paywall configured for a placement. */
    presentByPlacement: (placement: string, context?: PaywallContext): Promise<void> =>
      AppdnaModule.presentPaywallByPlacement(placement, context),
  };

  /** Remote config module. */
  static remoteConfig = {
    get: async (key: string): Promise<unknown> =>
      parseNativeJson<unknown>(await AppdnaModule.getRemoteConfig(key)),
    refresh: (): Promise<void> => AppdnaModule.refreshConfig(),
    /** Get all remote config values as a map. */
    getAll: async (): Promise<Record<string, unknown>> =>
      parseNativeJson<Record<string, unknown>>(await AppdnaModule.getAllRemoteConfig()),
    /** Register a callback for remote config changes. Returns unsubscribe function. */
    onChanged: (callback: () => void): (() => void) => {
      // Native passes no useful payload; the callback takes none. Adapting here keeps the public
      // signature free of an argument the host must never depend on.
      const sub = addNativeListener('onRemoteConfigChanged', () => callback());
      return () => sub.remove();
    },
  };

  /** Feature flags module. */
  static features = {
    isEnabled: (flag: string): Promise<boolean> => AppdnaModule.isFeatureEnabled(flag),
    /** Get the variant value for a feature flag (for multi-variate flags). */
    getVariant: async (flag: string): Promise<unknown> =>
      parseNativeJson<unknown>(await AppdnaModule.getFeatureVariant(flag)),
    /** Register a callback for feature flag changes. Returns unsubscribe function. */
    onChanged: (callback: () => void): (() => void) => {
      const sub = addNativeListener('onFeatureFlagsChanged', () => callback());
      return () => sub.remove();
    },
  };

  /** Experiments module. */
  static experiments = {
    /** E2 — native encodes the variant as JSON, because it may legitimately be null. */
    getVariant: async (experimentId: string): Promise<string | null> =>
      parseNativeJson<string | null>(await AppdnaModule.getExperimentVariant(experimentId)),
    isInVariant: (experimentId: string, variantId: string): Promise<boolean> =>
      AppdnaModule.isInVariant(experimentId, variantId),
    /** Get all experiment exposures for the current user. */
    getExposures: (): Promise<Array<Record<string, unknown>>> =>
      AppdnaModule.getExperimentExposures() as Promise<Array<Record<string, unknown>>>,
  };

  /** In-app messages module. */
  static inAppMessages = {
    /** W17 — fire-and-forget on the native side; a Promise here would only fake a round trip. */
    suppressDisplay: (suppress: boolean): void => AppdnaModule.suppressMessages(suppress),
    /** Set a delegate to receive in-app message lifecycle callbacks. */
    setDelegate: (delegate: AppDNAInAppMessageDelegate): void => {
      addNativeListener<{ messageId: string; trigger: string }>('onMessageShown', (data) => {
        delegate.onMessageShown(data.messageId, data.trigger);
        // Deprecated shim. Native never emitted `onMessagePresented`; forwarding keeps a host that
        // implemented it from silently going deaf when it upgrades.
        delegate.onMessagePresented?.(data.messageId);
      });
      addNativeListener<{ messageId: string; action: string; data?: Record<string, unknown> }>('onMessageAction', (data) =>
        delegate.onMessageAction(data.messageId, data.action, data.data));
      addNativeListener<{ messageId: string }>('onMessageDismissed', (data) =>
        delegate.onMessageDismissed(data.messageId));
      // §5.1 — `shouldShowMessage` is a VETO, not an observation. It used to be registered on the
      // one-way event channel, where the listener's return value is discarded and a message the host
      // suppressed was shown anyway. It goes on the host-callback channel, which native awaits.
      registerHostCallback('shouldShowMessage', (args) =>
        delegate.shouldShowMessage(args.messageId as string));
    },
  };

  /** Surveys module. */
  static surveys = {
    present: (surveyId: string): Promise<void> => AppdnaModule.presentSurvey(surveyId),
    /** Set a delegate to receive survey lifecycle callbacks. */
    setDelegate: (delegate: AppDNASurveyDelegate): void => {
      addNativeListener<{ surveyId: string }>('onSurveyPresented', (data) =>
        delegate.onSurveyPresented(data.surveyId));
      addNativeListener<{ surveyId: string; responses: Array<Record<string, unknown>> }>('onSurveyCompleted', (data) =>
        delegate.onSurveyCompleted(data.surveyId, data.responses));
      addNativeListener<{ surveyId: string }>('onSurveyDismissed', (data) =>
        delegate.onSurveyDismissed(data.surveyId));
    },
  };

  /** Deep links module. */
  static deepLinks = {
    handleURL: (url: string): Promise<void> => AppdnaModule.handleDeepLink(url),
    /** Set a delegate to receive deep link callbacks. */
    setDelegate: (delegate: AppDNADeepLinkDelegate): void => {
      addNativeListener<{ url: string; params?: Record<string, string> }>('onDeepLinkReceived', (data) =>
        delegate.onDeepLinkReceived(data.url, data.params ?? {}));
      // §5 — a veto: native awaits it before dispatching the link, so it cannot ride the event
      // channel, where a listener's return value is discarded. Defaults to allow.
      registerHostCallback('shouldOpen', (a) =>
        delegate.shouldOpen(a.url as string, (a.params ?? {}) as Record<string, unknown>));
    },
  };

  /**
   * SPEC-404 — backend-driven lock state. Fires once per transition, so a host can surface a
   * "service unavailable" banner and retry its event queue when the lock clears.
   */
  static lifecycle = {
    setDelegate: (delegate: AppDNALifecycleDelegate): void => {
      addNativeListener<{ reason: string; lockedAt: string }>('onSdkRuntimeLocked', (data) =>
        delegate.onSdkRuntimeLocked(data.reason, data.lockedAt));
      addNativeListener('onSdkRuntimeUnlocked', () => delegate.onSdkRuntimeUnlocked());
    },
  };

  /**
   * D-k / AC-31 — a subsystem failed to start and the SDK is running degraded. Analytics keep
   * flowing; remote config, paywalls and experiments may not. Nothing else surfaces this.
   */
  static onInitDegraded(callback: (error: { type: string; message: string }) => void): () => void {
    const sub = addNativeListener<{ type: string; message: string }>('onInitDegraded', callback);
    return () => sub.remove();
  }

  /** The last non-fatal init error, or null. Useful when a host binds its listener late. */
  static async getLastInitError(): Promise<{ type: string; message: string } | null> {
    return parseNativeJson<{ type: string; message: string } | null>(await AppdnaModule.getLastInitError());
  }

  /** D-h / AC-22 — announce the visible screen; every subsequent event carries it as `context.screen`. */
  static notifyScreenAppeared(screenName: string): void {
    AppdnaModule.notifyScreenAppeared(screenName);
  }

  /** A human-readable diagnostic report, including the consent decision and veto-timeout count. */
  static diagnose(): Promise<string> {
    return AppdnaModule.diagnose();
  }

  /** Whether analytics consent is currently granted. */
  static isConsentGranted(): Promise<boolean> {
    return AppdnaModule.isConsentGranted();
  }

  /**
   * Billing module namespace.
   *
   * Every member forwards to `AppDNABilling` rather than re-reaching for the native module. The two
   * used to be parallel implementations, and they drifted: this one listened for
   * `onBillingPurchaseCompleted`, `onBillingPurchaseFailed`, `onBillingEntitlementsChanged` and
   * `onBillingRestoreCompleted` — four names native has never emitted under any architecture. Those
   * four delegate methods could not fire. One implementation cannot drift from itself.
   */
  static billing = {
    /** Get localized product information from the store. */
    getProducts: (productIds: string[]): Promise<ProductInfo[]> =>
      AppDNABilling.getProducts(productIds),
    /** Purchase a product by its store product ID. */
    purchase: (productId: string, offerToken?: string): Promise<PurchaseResult> =>
      AppDNABilling.purchase(productId, offerToken),
    /** Restore previously purchased products. Resolves the restored product IDs, not entitlements. */
    restorePurchases: (): Promise<string[]> => AppDNABilling.restorePurchases(),
    /** Check if the user has an active subscription. */
    hasActiveSubscription: (): Promise<boolean> => AppDNABilling.hasActiveSubscription(),
    /** Get all current entitlements for the user. */
    getEntitlements: (): Promise<Entitlement[]> => AppDNABilling.getEntitlements(),
    /** Listen for entitlement changes. Returns unsubscribe function. */
    onEntitlementsChanged: (callback: (entitlements: Entitlement[]) => void): (() => void) =>
      AppDNABilling.onEntitlementsChanged(callback),
    /** Set a delegate to receive billing lifecycle callbacks. */
    setDelegate: (delegate: AppDNABillingDelegate): void => AppDNABilling.setDelegate(delegate),
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
