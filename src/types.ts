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
  /**
   * 🔴 `experiment` and `variant` were MISSING from this type while BOTH natives parsed them
   * (ios/AppdnaModuleImpl.swift:766-767, android/.../AppdnaModule.kt:847-848). TypeScript rejects an
   * excess property, so a JS host could not pass them at all: the native side read fields the wrapper
   * made it impossible to send. Dead surface, wrapper-side — which is the harder direction to notice,
   * because nothing crashes and nothing logs. The paywall simply is not attributed to the experiment
   * that served it.
   */
  experiment?: string;
  variant?: string;
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
  /**
   * Seconds a host veto may take before native applies the hook's own default. Default 5.
   *
   * Both `parseOptions` implementations have always read this, and it was missing from this type —
   * so the timeout that all eight veto hooks depend on could not be set from TypeScript without an
   * error. A knob native reads and TS forbids is not a knob.
   */
  vetoTimeout?: number;
  /**
   * When true, analytics stay OFF until `setConsent(true)`, and no event — not even
   * `sdk_initialized` — is emitted before that decision. Default false (analytics are opt-out).
   * Read by both natives; likewise absent from this type until now.
   */
  requireConsent?: boolean;
  /**
   * Android-only: the notification small-icon drawable resource id (an `R.drawable.*` int). Ignored
   * on iOS. Only useful when a native Android layer supplies the id.
   */
  notificationIcon?: number;
}
