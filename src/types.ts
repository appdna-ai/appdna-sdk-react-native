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

export type AppDNAEnvironment = 'production' | 'staging';

export type AppDNALogLevel = 'none' | 'error' | 'warning' | 'info' | 'debug';

export type AppDNABillingProvider = 'storeKit2' | 'revenueCat' | 'none';

export interface AppDNAOptions {
  /** Automatic flush interval in seconds. Default: 30. */
  flushInterval?: number;
  /** Number of events per flush batch. Default: 20. */
  batchSize?: number;
  /** Remote config cache TTL in seconds. Default: 300 (5 min). */
  configTTL?: number;
  /** Log verbosity. Default: 'warning'. */
  logLevel?: AppDNALogLevel;
  /** Billing provider for paywall purchases (iOS only). Default: 'storeKit2'. */
  billingProvider?: AppDNABillingProvider;
}
