import {
  AppdnaModule,
  addNativeListener,
  parseNativeJson,
  setDelegateListeners,
  removeAllDelegateListeners,
} from './nativeModule';
import { registerHostCallback, installHostCallbackDispatcher } from './hostCallbacks';
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
  AppDNAScreenDelegate,
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
  AppDNAScreenDelegate,
} from './generated/delegates';

/**
 * W16 — a synchronous, in-memory snapshot of remote config for hot-path reads.
 *
 * Native config reads are async bridge round-trips (and E2 makes several cross as a JSON string
 * parsed in the facade). A component reading a flag PER RENDER would pay a hop + parse every render.
 * This caches the whole config map and refreshes it when native fires `onRemoteConfigChanged`, so
 * `remoteConfig.getCached(key)` is a synchronous in-memory read.
 *
 * It is a PERF CACHE over native reads — NOT a source of truth and NOT persistence (nothing is
 * written to disk; that would violate ADR-001). It holds only what native already returned. Prime it
 * once after `configure()`; per-render reads use `getCached()`, one-off reads stay async via `get()`.
 */
let _configSnapshot: Record<string, unknown> | null = null;
let _configSnapshotSub: { remove: () => void } | null = null;

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
    // The veto dispatcher must exist BEFORE native starts asking. Native registers all eight hooks
    // unconditionally during configure(), and the onboarding renderer awaits `onBeforeStepRender` on
    // EVERY step. If the dispatcher were installed lazily by the first `setDelegate` — as it was —
    // then a host that registers no delegate at all (the common integration) would answer nothing,
    // and native would sit out the full veto timeout (5 s by default) before applying its default:
    // a five-second freeze before every onboarding step, every deep link, every in-app message.
    installHostCallbackDispatcher();
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

  /**
   * Track a custom event. **Fire-and-forget (W17): returns `void`, not a Promise.**
   *
   * `track()` crosses the JS→native bridge once per call; native batches the actual UPLOAD. Awaiting
   * each call would add a Promise allocation and a microtask hop per event — expensive on hot paths
   * (scroll/keystroke instrumentation is N crossings on the JS thread). The crossing is unavoidable;
   * the per-call Promise is not. A rejection — only possible if the bridge is being torn down — is
   * swallowed so it never surfaces as an unhandled rejection. Call {@link flush} if you need delivery
   * confirmation.
   */
  static track(event: string, properties?: Record<string, unknown>): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.resolve(AppdnaModule.track(event, properties)).catch(() => {
      /* fire-and-forget: a torn-down bridge must not crash the app */
    });
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
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('push', () => [
        addNativeListener<{ token: string }>('onPushTokenRegistered', (data) => delegate.onPushTokenRegistered(data.token)),
        addNativeListener<{ payload: Record<string, unknown>; inForeground: boolean }>('onPushReceived', (data) => delegate.onPushReceived(data.payload, data.inForeground)),
        addNativeListener<{ payload: Record<string, unknown>; actionId?: string }>('onPushTapped', (data) => delegate.onPushTapped(data.payload, data.actionId)),
      ]);
    },
  };

  /** Onboarding module. */
  static onboarding = {
    present: (flowId: string, context?: OnboardingContext): Promise<boolean> =>
      AppdnaModule.presentOnboarding(flowId, context),
    /** Set a delegate to receive onboarding lifecycle callbacks. */
    setDelegate: (delegate: AppDNAOnboardingDelegate): void => {
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('onboarding', () => [
        addNativeListener<{ flowId: string }>('onOnboardingStarted', (data) => delegate.onOnboardingStarted(data.flowId)),
        addNativeListener<{ flowId: string; stepId: string; stepIndex: number; totalSteps: number }>('onOnboardingStepChanged', (data) => delegate.onOnboardingStepChanged(data.flowId, data.stepId, data.stepIndex, data.totalSteps)),
        addNativeListener<{ flowId: string; responses: Record<string, unknown> }>('onOnboardingCompleted', (data) => delegate.onOnboardingCompleted(data.flowId, data.responses)),
        addNativeListener<{ flowId: string; atStep: number }>('onOnboardingDismissed', (data) => delegate.onOnboardingDismissed(data.flowId, data.atStep)),
        addNativeListener<{ flowId: string; stepId: string; permissionType: string; granted: boolean }>('onPermissionResult', (data) => delegate.onPermissionResult(data.flowId, data.stepId, data.permissionType, data.granted)),
      ]);

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
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('paywall', () => [
        addNativeListener<{ paywallId: string }>('onPaywallPresented', (data) => delegate.onPaywallPresented(data.paywallId)),
        addNativeListener<{ paywallId: string; action: string }>('onPaywallAction', (data) => delegate.onPaywallAction(data.paywallId, data.action)),
        addNativeListener<{ paywallId: string; productId: string }>('onPaywallPurchaseStarted', (data) => delegate.onPaywallPurchaseStarted(data.paywallId, data.productId)),
        addNativeListener<{ paywallId: string; productId: string; transaction: Record<string, unknown> }>('onPaywallPurchaseCompleted', (data) => delegate.onPaywallPurchaseCompleted(data.paywallId, data.productId, data.transaction)),
        addNativeListener<{ paywallId: string; error: string }>('onPaywallPurchaseFailed', (data) => delegate.onPaywallPurchaseFailed(data.paywallId, data.error)),
        addNativeListener<{ paywallId: string }>('onPaywallDismissed', (data) => delegate.onPaywallDismissed(data.paywallId)),
        addNativeListener<{ paywallId: string }>('onPaywallRestoreStarted', (data) => delegate.onPaywallRestoreStarted(data.paywallId)),
        addNativeListener<{ paywallId: string; restoredProductIds: string[] }>('onPaywallRestoreCompleted', (data) => delegate.onPaywallRestoreCompleted(data.paywallId, data.restoredProductIds)),
        addNativeListener<{ paywallId: string; error: string }>('onPaywallRestoreFailed', (data) => delegate.onPaywallRestoreFailed(data.paywallId, data.error)),
        addNativeListener<{ paywallId: string; url: string }>('onPostPurchaseDeepLink', (data) => delegate.onPostPurchaseDeepLink(data.paywallId, data.url)),
        addNativeListener<{ paywallId: string }>('onPostPurchaseNextStep', (data) => delegate.onPostPurchaseNextStep(data.paywallId)),
      ]);

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
    /**
     * W16 — fetch the whole config map once and keep it fresh, so `getCached()` can read it
     * synchronously. Call after `configure()`. Idempotent: it (re)fetches the snapshot and, the first
     * time, subscribes to `onRemoteConfigChanged` to auto-refresh the cache when native's config
     * changes. Cheap to await once; the point is that everything AFTER it is synchronous.
     */
    primeSnapshot: async (): Promise<void> => {
      _configSnapshot = parseNativeJson<Record<string, unknown>>(
        await AppdnaModule.getAllRemoteConfig(),
      );
      if (!_configSnapshotSub) {
        _configSnapshotSub = addNativeListener('onRemoteConfigChanged', () => {
          // Re-fetch on change so the cache never serves a stale value. Fire-and-forget: the read is
          // async, but callers of getCached() see the new value on the next tick.
          void AppdnaModule.getAllRemoteConfig()
            .then((json) => {
              _configSnapshot = parseNativeJson<Record<string, unknown>>(json);
            })
            .catch(() => {
              /* a torn-down bridge: keep the last snapshot rather than crash */
            });
        });
      }
    },
    /**
     * W16 — synchronous read from the primed snapshot. Returns `undefined` if {@link primeSnapshot}
     * has not run yet (call it after `configure()`) OR if the key is absent. For per-render flag
     * reads; one-off reads should use the async `get()`.
     */
    getCached: (key: string): unknown => _configSnapshot?.[key],
    /** W16 — whether {@link primeSnapshot} has populated the synchronous cache. */
    hasSnapshot: (): boolean => _configSnapshot !== null,
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
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('inAppMessages', () => [
        addNativeListener<{ messageId: string; trigger: string }>('onMessageShown', (data) => {
          delegate.onMessageShown(data.messageId, data.trigger);
          // Deprecated shim. Native never emitted `onMessagePresented`; forwarding keeps a host that
          // implemented it from silently going deaf when it upgrades.
          delegate.onMessagePresented?.(data.messageId);
        }),
        addNativeListener<{ messageId: string; action: string; data?: Record<string, unknown> }>('onMessageAction', (data) => delegate.onMessageAction(data.messageId, data.action, data.data)),
        addNativeListener<{ messageId: string }>('onMessageDismissed', (data) => delegate.onMessageDismissed(data.messageId)),
      ]);
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
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('surveys', () => [
        addNativeListener<{ surveyId: string }>('onSurveyPresented', (data) => delegate.onSurveyPresented(data.surveyId)),
        addNativeListener<{ surveyId: string; responses: Array<Record<string, unknown>> }>('onSurveyCompleted', (data) => delegate.onSurveyCompleted(data.surveyId, data.responses)),
        addNativeListener<{ surveyId: string }>('onSurveyDismissed', (data) => delegate.onSurveyDismissed(data.surveyId)),
      ]);
    },
  };

  /**
   * Session data — values that live for the current session (P8).
   *
   * Both natives have shipped this all along; RN never wrapped it, which is why the docs described
   * `AppDNA.setSessionData` for a method that did not exist. Values cross as JSON (E2), so any
   * JSON-representable value round-trips.
   */
  static session = {
    /** Store a value. Native rejects a null — "store nothing" is not an operation either SDK has. */
    set: (key: string, value: unknown): Promise<void> =>
      AppdnaModule.setSessionData(key, JSON.stringify(value ?? null)),
    /** Read a value. Resolves `null` when unset. */
    get: async (key: string): Promise<unknown> =>
      parseNativeJson<unknown>(await AppdnaModule.getSessionData(key)),
    clear: (): Promise<void> => AppdnaModule.clearSessionData(),
  };

  /** The traits currently attached to the user. */
  static async getUserTraits(): Promise<Record<string, unknown>> {
    return parseNativeJson<Record<string, unknown>>(await AppdnaModule.getUserTraits());
  }

  /**
   * The structured answer to an onboarding location field — `{formatted_address, city, state,
   * state_code, country, country_code, latitude, longitude, timezone, timezone_offset, postal_code,
   * raw_query}`. Resolves `null` when that field was never answered.
   */
  static async getLocationData(fieldId: string): Promise<Record<string, unknown> | null> {
    return parseNativeJson<Record<string, unknown> | null>(await AppdnaModule.getLocationData(fieldId));
  }

  /**
   * Screens module — server-driven screens and flows (P8, the 9th delegate).
   *
   * Distinct from `<AppDNAScreenSlot>`, which embeds a screen INLINE in your own layout. These
   * PRESENT one over the app, and they are what fire `onScreenPresented`/`onScreenDismissed`/
   * `onFlowCompleted` — the slot raises nothing.
   */
  static screens = {
    /**
     * Present a screen. Resolves `false` when there was no view controller / Activity to present
     * from — the same contract as `presentOnboarding`.
     *
     * The RESULT does not come back here. A screen can be dismissed long after this resolves, so it
     * arrives on `onScreenDismissed` via {@link setDelegate}.
     */
    show: (screenId: string): Promise<boolean> => AppdnaModule.showScreen(screenId),
    /** Present a multi-screen flow. The result arrives on `onFlowCompleted`. */
    showFlow: (flowId: string): Promise<boolean> => AppdnaModule.showFlow(flowId),
    dismiss: (): Promise<void> => AppdnaModule.dismissScreen(),
    /** Render a screen straight from JSON, bypassing remote config. Console preview / QA only. */
    preview: (json: string): Promise<boolean> => AppdnaModule.previewScreen(json),
    /** Let the SDK inject screens into your navigation. Omit `screens` to intercept all of them. */
    enableNavigationInterception: (screens?: string[]): Promise<void> =>
      AppdnaModule.enableNavigationInterception(screens),
    disableNavigationInterception: (): Promise<void> => AppdnaModule.disableNavigationInterception(),
    /**
     * The 9th delegate. `onScreenAction` is a VETO — native awaits your answer before handling the
     * action — so it rides the host-callback seam rather than the event channel, where a listener's
     * return value is discarded. Defaults to allow.
     */
    setDelegate: (delegate: AppDNAScreenDelegate): void => {
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('screens', () => [
        addNativeListener<{ screenId: string }>('onScreenPresented', (data) => delegate.onScreenPresented(data.screenId)),
        addNativeListener<{ screenId: string; result: Record<string, unknown> }>('onScreenDismissed', (data) => delegate.onScreenDismissed(data.screenId, data.result)),
        addNativeListener<{ flowId: string; result: Record<string, unknown> }>('onFlowCompleted', (data) => delegate.onFlowCompleted(data.flowId, data.result)),
      ]);
      registerHostCallback('onScreenAction', (args) =>
        delegate.onScreenAction(args.screenId as string, args.action as Record<string, unknown>));
    },
  };

  /** Deep links module. */
  static deepLinks = {
    handleURL: (url: string): Promise<void> => AppdnaModule.handleDeepLink(url),
    /** Set a delegate to receive deep link callbacks. */
    setDelegate: (delegate: AppDNADeepLinkDelegate): void => {
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('deepLinks', () => [
        addNativeListener<{ url: string; params?: Record<string, string> }>('onDeepLinkReceived', (data) => delegate.onDeepLinkReceived(data.url, data.params ?? {})),
      ]);
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
      // Replaces the previous delegate's listeners rather than stacking a second set on top.
      setDelegateListeners('lifecycle', () => [
        addNativeListener<{ reason: string; lockedAt: string }>('onSdkRuntimeLocked', (data) => delegate.onSdkRuntimeLocked(data.reason, data.lockedAt)),
        addNativeListener('onSdkRuntimeUnlocked', () => delegate.onSdkRuntimeUnlocked()),
      ]);
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
    // W16 — drop the config snapshot and its refresh subscription so a shutdown→configure cycle does
    // not serve pre-shutdown config, and the listener is not left dangling.
    _configSnapshotSub?.remove();
    _configSnapshotSub = null;
    _configSnapshot = null;
    // Every delegate's listeners go too. They are subscriptions on a process-global native emitter;
    // leaving them attached across shutdown→configure is how one event reaches N stale delegates.
    removeAllDelegateListeners();
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
