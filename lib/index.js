import { NativeModules, NativeEventEmitter } from 'react-native';
export { AppDNABilling } from './billing';
export { AppDNAPush } from './push';
const { AppdnaModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(AppdnaModule);
/**
 * Main entry point for the AppDNA React Native SDK.
 * Thin wrapper around native iOS/Android SDKs via native modules.
 */
export class AppDNA {
    /** Initialize the SDK. Call once at app startup. */
    static async configure(apiKey, env = 'production', options) {
        return AppdnaModule.configure(apiKey, env, options ?? null);
    }
    /** Set log verbosity level at runtime. Valid: 'none','error','warning','info','debug'. */
    static setLogLevel(level) {
        AppdnaModule.setLogLevel(level);
    }
    /** Identify a user. */
    static async identify(userId, traits) {
        return AppdnaModule.identify(userId, traits ?? null);
    }
    /** Clear user identity. */
    static async reset() {
        return AppdnaModule.reset();
    }
    /** Track a custom event. */
    static async track(event, properties) {
        return AppdnaModule.track(event, properties ?? null);
    }
    /** Force flush all queued events. */
    static async flush() {
        return AppdnaModule.flush();
    }
    /** Present a paywall. */
    static async presentPaywall(id, context) {
        return AppdnaModule.presentPaywall(id, context ?? null);
    }
    /** Present an onboarding flow. */
    static async presentOnboarding(flowId) {
        return AppdnaModule.presentOnboarding(flowId);
    }
    /** Get a remote config value. */
    static async getRemoteConfig(key) {
        return AppdnaModule.getRemoteConfig(key);
    }
    /** Check if a feature flag is enabled. */
    static async isFeatureEnabled(flag) {
        return AppdnaModule.isFeatureEnabled(flag);
    }
    /** Get the variant assignment for an experiment. */
    static async getExperimentVariant(experimentId) {
        return AppdnaModule.getExperimentVariant(experimentId);
    }
    /** Check if the user is in a specific variant. */
    static async isInVariant(experimentId, variantId) {
        return AppdnaModule.isInVariant(experimentId, variantId);
    }
    /** Get experiment config value. */
    static async getExperimentConfig(experimentId, key) {
        return AppdnaModule.getExperimentConfig(experimentId, key);
    }
    /** Set push token. Registers with backend for direct push delivery. */
    static async setPushToken(token) {
        return AppdnaModule.setPushToken(token);
    }
    /** Report push permission status. */
    static async setPushPermission(granted) {
        return AppdnaModule.setPushPermission(granted);
    }
    /** Track push notification delivered (SPEC-030). */
    static async trackPushDelivered(pushId) {
        return AppdnaModule.trackPushDelivered(pushId);
    }
    /** Track push notification tapped (SPEC-030). */
    static async trackPushTapped(pushId, action) {
        return AppdnaModule.trackPushTapped(pushId, action);
    }
    /** Set analytics consent. */
    static async setConsent(analytics) {
        return AppdnaModule.setConsent(analytics);
    }
    // MARK: - Ready
    /**
     * Returns a Promise that resolves when the SDK is fully initialized
     * (config fetched, managers ready). If already ready, resolves immediately.
     * Call after `configure()` to gate any logic that depends on remote config,
     * experiments, feature flags, or deep links.
     */
    static async onReady() {
        await AppdnaModule.onReady();
    }
    // MARK: - v0.3: Web Entitlements
    /** Get the current web subscription entitlement. */
    static async getWebEntitlement() {
        return AppdnaModule.getWebEntitlement();
    }
    /** Listen for web entitlement changes. Returns unsubscribe function. */
    static onWebEntitlementChanged(callback) {
        const subscription = eventEmitter.addListener('onWebEntitlementChanged', callback);
        return () => subscription.remove();
    }
    // MARK: - v0.3: Deferred Deep Links
    /** Check for a deferred deep link on first launch. */
    static async checkDeferredDeepLink() {
        return AppdnaModule.checkDeferredDeepLink();
    }
    // MARK: - Lifecycle
    /**
     * Shut down the SDK and release resources.
     * On Android this delegates to AppDNA.shutdown(); on iOS this is a no-op.
     */
    static async shutdown() {
        return AppdnaModule.shutdown();
    }
    /** Get the native SDK version string (e.g. "1.0.0"). */
    static async getSdkVersion() {
        return AppdnaModule.getSdkVersion();
    }
}
// MARK: - v1.0 Module Namespaces
/** Push notification module. */
AppDNA.push = {
    setToken: (token) => AppdnaModule.setPushToken(token),
    setPermission: (granted) => AppdnaModule.setPushPermission(granted),
    trackDelivered: (pushId) => AppdnaModule.trackPushDelivered(pushId),
    trackTapped: (pushId, action) => AppdnaModule.trackPushTapped(pushId, action),
    /** Request push notification permission from the OS. */
    requestPermission: () => AppdnaModule.requestPushPermission(),
    /** Get the current push token. */
    getToken: () => AppdnaModule.getPushToken(),
    /** Set a delegate to receive push notification callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onPushTokenRegistered', (data) => delegate.onPushTokenRegistered(data.token));
        eventEmitter.addListener('onPushReceived', (data) => delegate.onPushReceived(data.payload, data.inForeground));
        eventEmitter.addListener('onPushTapped', (data) => delegate.onPushTapped(data.payload, data.actionId));
    },
};
/** Onboarding module. */
AppDNA.onboarding = {
    present: (flowId, context) => AppdnaModule.presentOnboarding(flowId, context ?? null),
    /** Set a delegate to receive onboarding lifecycle callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onOnboardingStarted', (data) => delegate.onOnboardingStarted(data.flowId));
        eventEmitter.addListener('onOnboardingStepChanged', (data) => delegate.onOnboardingStepChanged(data.flowId, data.stepId, data.stepIndex, data.totalSteps));
        eventEmitter.addListener('onOnboardingCompleted', (data) => delegate.onOnboardingCompleted(data.flowId, data.responses));
        eventEmitter.addListener('onOnboardingDismissed', (data) => delegate.onOnboardingDismissed(data.flowId, data.atStep));
    },
};
/** Paywall module. */
AppDNA.paywall = {
    present: (paywallId, context) => AppdnaModule.presentPaywall(paywallId, context ?? null),
    /** Set a delegate to receive paywall lifecycle callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onPaywallPresented', (data) => delegate.onPaywallPresented(data.paywallId));
        eventEmitter.addListener('onPaywallAction', (data) => delegate.onPaywallAction(data.paywallId, data.action));
        eventEmitter.addListener('onPaywallPurchaseStarted', (data) => delegate.onPaywallPurchaseStarted(data.paywallId, data.productId));
        eventEmitter.addListener('onPaywallPurchaseCompleted', (data) => delegate.onPaywallPurchaseCompleted(data.paywallId, data.productId, data.transaction));
        eventEmitter.addListener('onPaywallPurchaseFailed', (data) => delegate.onPaywallPurchaseFailed(data.paywallId, data.error));
        eventEmitter.addListener('onPaywallDismissed', (data) => delegate.onPaywallDismissed(data.paywallId));
    },
};
/** Remote config module. */
AppDNA.remoteConfig = {
    get: (key) => AppdnaModule.getRemoteConfig(key),
    refresh: () => AppdnaModule.refreshConfig(),
    /** Get all remote config values as a map. */
    getAll: () => AppdnaModule.getAllRemoteConfig(),
    /** Register a callback for remote config changes. Returns unsubscribe function. */
    onChanged: (callback) => {
        const sub = eventEmitter.addListener('onRemoteConfigChanged', callback);
        return () => sub.remove();
    },
};
/** Feature flags module. */
AppDNA.features = {
    isEnabled: (flag) => AppdnaModule.isFeatureEnabled(flag),
    /** Get the variant value for a feature flag (for multi-variate flags). */
    getVariant: (flag) => AppdnaModule.getFeatureVariant(flag),
    /** Register a callback for feature flag changes. Returns unsubscribe function. */
    onChanged: (callback) => {
        const sub = eventEmitter.addListener('onFeatureFlagsChanged', callback);
        return () => sub.remove();
    },
};
/** Experiments module. */
AppDNA.experiments = {
    getVariant: (experimentId) => AppdnaModule.getExperimentVariant(experimentId),
    isInVariant: (experimentId, variantId) => AppdnaModule.isInVariant(experimentId, variantId),
    /** Get all experiment exposures for the current user. */
    getExposures: () => AppdnaModule.getExperimentExposures(),
};
/** In-app messages module. */
AppDNA.inAppMessages = {
    suppressDisplay: (suppress) => AppdnaModule.suppressMessages(suppress),
    /** Set a delegate to receive in-app message lifecycle callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onMessageShown', (data) => delegate.onMessageShown(data.messageId, data.trigger));
        eventEmitter.addListener('onMessageAction', (data) => delegate.onMessageAction(data.messageId, data.action, data.data));
        eventEmitter.addListener('onMessageDismissed', (data) => delegate.onMessageDismissed(data.messageId));
        eventEmitter.addListener('shouldShowMessage', (data) => {
            const result = delegate.shouldShowMessage(data.messageId);
            return result;
        });
    },
};
/** Surveys module. */
AppDNA.surveys = {
    present: (surveyId) => AppdnaModule.presentSurvey(surveyId),
    /** Set a delegate to receive survey lifecycle callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onSurveyPresented', (data) => delegate.onSurveyPresented(data.surveyId));
        eventEmitter.addListener('onSurveyCompleted', (data) => delegate.onSurveyCompleted(data.surveyId, data.responses));
        eventEmitter.addListener('onSurveyDismissed', (data) => delegate.onSurveyDismissed(data.surveyId));
    },
};
/** Deep links module. */
AppDNA.deepLinks = {
    handleURL: (url) => AppdnaModule.handleDeepLink(url),
    /** Set a delegate to receive deep link callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onDeepLinkReceived', (data) => delegate.onDeepLinkReceived(data.url, data.params ?? {}));
    },
};
/** Billing module namespace. Mirrors AppDNABilling methods for convenience. */
AppDNA.billing = {
    /** Get localized product information from the store. */
    getProducts: (productIds) => AppdnaModule.getProducts(productIds),
    /** Purchase a product by its store product ID. */
    purchase: (productId, offerToken) => AppdnaModule.purchase(productId, offerToken ?? null),
    /** Restore previously purchased products. */
    restorePurchases: () => AppdnaModule.restorePurchases(),
    /** Check if the user has an active subscription. */
    hasActiveSubscription: () => AppdnaModule.hasActiveSubscription(),
    /** Get all current entitlements for the user. */
    getEntitlements: () => AppdnaModule.getEntitlements(),
    /** Listen for entitlement changes. Returns unsubscribe function. */
    onEntitlementsChanged: (callback) => {
        const sub = eventEmitter.addListener('onEntitlementsChanged', callback);
        return () => sub.remove();
    },
    /** Set a delegate to receive billing lifecycle callbacks. */
    setDelegate: (delegate) => {
        eventEmitter.addListener('onBillingPurchaseCompleted', (data) => delegate.onPurchaseCompleted(data.productId, data.transaction));
        eventEmitter.addListener('onBillingPurchaseFailed', (data) => delegate.onPurchaseFailed(data.productId, data.error));
        eventEmitter.addListener('onBillingEntitlementsChanged', (data) => delegate.onEntitlementsChanged(data.entitlements));
        eventEmitter.addListener('onBillingRestoreCompleted', (data) => delegate.onRestoreCompleted(data.restoredProducts));
    },
};
//# sourceMappingURL=index.js.map