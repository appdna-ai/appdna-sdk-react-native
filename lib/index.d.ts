import type { WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAEnvironment, AppDNAOptions } from './types';
import type { Entitlement, PurchaseResult, ProductInfo } from './billing';
export type { WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAEnvironment, AppDNAOptions };
export { AppDNABilling } from './billing';
export type { Entitlement, PurchaseResult, ProductInfo } from './billing';
export { AppDNAPush } from './push';
export type { PushPayload } from './push';
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
export declare class AppDNA {
    /** Initialize the SDK. Call once at app startup. */
    static configure(apiKey: string, env?: AppDNAEnvironment, options?: AppDNAOptions): Promise<void>;
    /** Set log verbosity level at runtime. Valid: 'none','error','warning','info','debug'. */
    static setLogLevel(level: string): void;
    /** Identify a user. */
    static identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
    /** Clear user identity. */
    static reset(): Promise<void>;
    /** Track a custom event. */
    static track(event: string, properties?: Record<string, unknown>): Promise<void>;
    /** Force flush all queued events. */
    static flush(): Promise<void>;
    /** Present a paywall. */
    static presentPaywall(id: string, context?: PaywallContext): Promise<void>;
    /** Present an onboarding flow. */
    static presentOnboarding(flowId: string): Promise<void>;
    /** Get a remote config value. */
    static getRemoteConfig(key: string): Promise<unknown>;
    /** Check if a feature flag is enabled. */
    static isFeatureEnabled(flag: string): Promise<boolean>;
    /** Get the variant assignment for an experiment. */
    static getExperimentVariant(experimentId: string): Promise<string | null>;
    /** Check if the user is in a specific variant. */
    static isInVariant(experimentId: string, variantId: string): Promise<boolean>;
    /** Get experiment config value. */
    static getExperimentConfig(experimentId: string, key: string): Promise<unknown>;
    /** Set push token. Registers with backend for direct push delivery. */
    static setPushToken(token: string): Promise<void>;
    /** Report push permission status. */
    static setPushPermission(granted: boolean): Promise<void>;
    /** Track push notification delivered (SPEC-030). */
    static trackPushDelivered(pushId: string): Promise<void>;
    /** Track push notification tapped (SPEC-030). */
    static trackPushTapped(pushId: string, action?: string): Promise<void>;
    /** Set analytics consent. */
    static setConsent(analytics: boolean): Promise<void>;
    /**
     * Returns a Promise that resolves when the SDK is fully initialized
     * (config fetched, managers ready). If already ready, resolves immediately.
     * Call after `configure()` to gate any logic that depends on remote config,
     * experiments, feature flags, or deep links.
     */
    static onReady(): Promise<void>;
    /** Get the current web subscription entitlement. */
    static getWebEntitlement(): Promise<WebEntitlement | null>;
    /** Listen for web entitlement changes. Returns unsubscribe function. */
    static onWebEntitlementChanged(callback: (entitlement: WebEntitlement | null) => void): () => void;
    /** Check for a deferred deep link on first launch. */
    static checkDeferredDeepLink(): Promise<DeferredDeepLink | null>;
    /** Push notification module. */
    static push: {
        setToken: (token: string) => any;
        setPermission: (granted: boolean) => any;
        trackDelivered: (pushId: string) => any;
        trackTapped: (pushId: string, action?: string) => any;
        /** Request push notification permission from the OS. */
        requestPermission: () => Promise<boolean>;
        /** Get the current push token. */
        getToken: () => Promise<string | null>;
        /** Set a delegate to receive push notification callbacks. */
        setDelegate: (delegate: AppDNAPushDelegate) => void;
    };
    /** Onboarding module. */
    static onboarding: {
        present: (flowId: string, context?: OnboardingContext) => any;
        /** Set a delegate to receive onboarding lifecycle callbacks. */
        setDelegate: (delegate: AppDNAOnboardingDelegate) => void;
    };
    /** Paywall module. */
    static paywall: {
        present: (paywallId: string, context?: PaywallContext) => any;
        /** Set a delegate to receive paywall lifecycle callbacks. */
        setDelegate: (delegate: AppDNAPaywallDelegate) => void;
    };
    /** Remote config module. */
    static remoteConfig: {
        get: (key: string) => Promise<unknown>;
        refresh: () => Promise<void>;
        /** Get all remote config values as a map. */
        getAll: () => Promise<Record<string, unknown>>;
        /** Register a callback for remote config changes. Returns unsubscribe function. */
        onChanged: (callback: () => void) => (() => void);
    };
    /** Feature flags module. */
    static features: {
        isEnabled: (flag: string) => Promise<boolean>;
        /** Get the variant value for a feature flag (for multi-variate flags). */
        getVariant: (flag: string) => Promise<unknown>;
        /** Register a callback for feature flag changes. Returns unsubscribe function. */
        onChanged: (callback: () => void) => (() => void);
    };
    /** Experiments module. */
    static experiments: {
        getVariant: (experimentId: string) => Promise<string | null>;
        isInVariant: (experimentId: string, variantId: string) => Promise<boolean>;
        /** Get all experiment exposures for the current user. */
        getExposures: () => Promise<Array<Record<string, unknown>>>;
    };
    /** In-app messages module. */
    static inAppMessages: {
        suppressDisplay: (suppress: boolean) => Promise<void>;
        /** Set a delegate to receive in-app message lifecycle callbacks. */
        setDelegate: (delegate: AppDNAInAppMessageDelegate) => void;
    };
    /** Surveys module. */
    static surveys: {
        present: (surveyId: string) => Promise<void>;
        /** Set a delegate to receive survey lifecycle callbacks. */
        setDelegate: (delegate: AppDNASurveyDelegate) => void;
    };
    /** Deep links module. */
    static deepLinks: {
        handleURL: (url: string) => Promise<void>;
        /** Set a delegate to receive deep link callbacks. */
        setDelegate: (delegate: AppDNADeepLinkDelegate) => void;
    };
    /** Billing module namespace. Mirrors AppDNABilling methods for convenience. */
    static billing: {
        /** Get localized product information from the store. */
        getProducts: (productIds: string[]) => Promise<ProductInfo[]>;
        /** Purchase a product by its store product ID. */
        purchase: (productId: string, offerToken?: string) => Promise<PurchaseResult>;
        /** Restore previously purchased products. */
        restorePurchases: () => Promise<Entitlement[]>;
        /** Check if the user has an active subscription. */
        hasActiveSubscription: () => Promise<boolean>;
        /** Get all current entitlements for the user. */
        getEntitlements: () => Promise<Entitlement[]>;
        /** Listen for entitlement changes. Returns unsubscribe function. */
        onEntitlementsChanged: (callback: (entitlements: Entitlement[]) => void) => (() => void);
        /** Set a delegate to receive billing lifecycle callbacks. */
        setDelegate: (delegate: AppDNABillingDelegate) => void;
    };
    /**
     * Shut down the SDK and release resources.
     * On Android this delegates to AppDNA.shutdown(); on iOS this is a no-op.
     */
    static shutdown(): Promise<void>;
    /** Get the native SDK version string (e.g. "1.0.0"). */
    static getSdkVersion(): Promise<string>;
}
/** Context passed to onboarding flows for dynamic branching. */
export interface OnboardingContext {
    source?: string;
    campaign?: string;
    referrer?: string;
    userProperties?: Record<string, unknown>;
    experimentOverrides?: Record<string, string>;
}
//# sourceMappingURL=index.d.ts.map