export interface WebEntitlement {
  isActive: boolean;
  planName?: string;
  priceId?: string;
  interval?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodEnd?: number;
  trialEnd?: number;
}

export interface DeferredDeepLink {
  screen: string;
  params: Record<string, string>;
  visitorId: string;
}

export interface PaywallContext {
  placement?: string;
  customData?: Record<string, unknown>;
}

/**
 * SPEC-070-B P1. The native enum is `production | sandbox` on BOTH platforms
 * (`Configuration.swift:4`, `Configuration.kt:12`). `'staging'` named a case that has never existed;
 * the iOS shim's `env == "staging" ? .staging : .production` could not compile, and a host passing
 * `'staging'` silently got production. Which environment you are in is decided by the API-key prefix
 * (`adn_test_` vs `adn_live_`) — this only selects the SDK's own environment tag.
 */
export type AppDNAEnvironment = 'production' | 'sandbox';

export type AppDNALogLevel = 'none' | 'error' | 'warning' | 'info' | 'debug';

export type AppDNABillingProvider = 'storeKit2' | 'revenueCat' | 'none';

export interface AppDNAOptions {
  /** Automatic flush interval in seconds. Default: 30. */
  flushInterval?: number;
  /** Number of events per flush batch. Default: 20. */
  batchSize?: number;
  /** Remote config cache TTL in seconds. Default: 3600 (1 hour), set natively. */
  configTTL?: number;
  /** Log verbosity. Default: 'warning'. */
  logLevel?: AppDNALogLevel;
  /** Billing provider for paywall purchases (iOS only). Default: 'storeKit2'. */
  billingProvider?: AppDNABillingProvider;
}
