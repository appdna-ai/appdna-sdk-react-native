# AppDNA React Native SDK (v0.3.0)

TypeScript SDK for React Native. Thin native module wrapper around the native iOS and Android SDKs. All logic is delegated to the native layer via `NativeModules` and `NativeEventEmitter`.

---

## Public API

### Initialization

- `AppDNA.configure(apiKey: string, env: AppDNAEnvironment = 'production', options?: AppDNAOptions): Promise<void>` -- Initialize the SDK. Call once at app startup. Delegates to native `AppDNA.configure()`.
- `AppDNA.onReady(): Promise<void>` -- Returns a Promise that resolves when the SDK is fully initialized (config fetched, managers ready).

### Identity

- `AppDNA.identify(userId: string, traits?: Record<string, unknown>): Promise<void>` -- Link the anonymous device to a known user.
- `AppDNA.reset(): Promise<void>` -- Clear user identity (keeps anonymous ID).

### Events

- `AppDNA.track(event: string, properties?: Record<string, unknown>): Promise<void>` -- Track a custom event.
- `AppDNA.flush(): Promise<void>` -- Force flush all queued events.

### Remote Config

- `AppDNA.getRemoteConfig(key: string): Promise<unknown>` -- Get a remote config value by key.
- `AppDNA.isFeatureEnabled(flag: string): Promise<boolean>` -- Check if a feature flag is enabled.

### Experiments

- `AppDNA.getExperimentVariant(experimentId: string): Promise<string | null>` -- Get the variant assignment for an experiment.
- `AppDNA.isInVariant(experimentId: string, variantId: string): Promise<boolean>` -- Check if the user is in a specific variant.
- `AppDNA.getExperimentConfig(experimentId: string, key: string): Promise<unknown>` -- Get experiment config value.

### Paywalls

- `AppDNA.presentPaywall(id: string, context?: PaywallContext): Promise<void>` -- Present a paywall.

### Onboarding

- `AppDNA.presentOnboarding(flowId: string): Promise<void>` -- Present an onboarding flow by ID.

### Push Notifications

- `AppDNA.setPushToken(token: string): Promise<void>` -- Set push token (APNS hex string on iOS, FCM token on Android).
- `AppDNA.setPushPermission(granted: boolean): Promise<void>` -- Report push permission status.

### Web Entitlements (v0.3)

- `AppDNA.getWebEntitlement(): Promise<WebEntitlement | null>` -- Get the current web subscription entitlement.
- `AppDNA.onWebEntitlementChanged(callback: (entitlement: WebEntitlement | null) => void): () => void` -- Listen for web entitlement changes. Returns an unsubscribe function.
- `AppDNA.checkDeferredDeepLink(): Promise<DeferredDeepLink | null>` -- Check for a deferred deep link on first launch.

### Privacy

- `AppDNA.setConsent(analytics: boolean): Promise<void>` -- Set analytics consent.

### Lifecycle

- `AppDNA.shutdown(): Promise<void>` -- Shut down the SDK. Android delegates to `AppDNA.shutdown()`; iOS is a no-op.
- `AppDNA.getSdkVersion(): Promise<string>` -- Get the native SDK version string.

### Configuration Options (`AppDNAOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `flushInterval` | `number?` | 30 | Auto flush interval in seconds |
| `batchSize` | `number?` | 20 | Events per flush batch |
| `configTTL` | `number?` | 3600 | Remote config cache TTL in seconds |
| `logLevel` | `AppDNALogLevel?` | `'warning'` | Log verbosity (none/error/warning/info/debug) |
| `billingProvider` | `AppDNABillingProvider?` | `'storeKit2'` | Billing provider (iOS only: storeKit2/revenueCat/none) |

---

## TypeScript Types

### `WebEntitlement`
```typescript
interface WebEntitlement {
  isActive: boolean;
  planName?: string;
  priceId?: string;
  interval?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodEnd?: number;
  trialEnd?: number;
}
```

### `DeferredDeepLink`
```typescript
interface DeferredDeepLink {
  screen: string;
  params: Record<string, string>;
  visitorId: string;
}
```

### `PaywallContext`
```typescript
interface PaywallContext {
  placement?: string;
  customData?: Record<string, unknown>;
}
```

### `AppDNAEnvironment`
```typescript
type AppDNAEnvironment = 'production' | 'staging';
```

---

## Native Events

| Event Name | Payload | Description |
|------------|---------|-------------|
| `onWebEntitlementChanged` | `WebEntitlement | null` | Web entitlement status changed |

---

## Firestore Paths (Read)

This SDK does NOT read Firestore directly. All Firestore reads are handled by the native iOS and Android SDKs. See their respective AGENT.md files for Firestore path details.

---

## Events Emitted

This SDK does NOT emit events directly. All event tracking is handled by the native iOS and Android SDKs via native modules. See their respective AGENT.md files for event details.

---

## File Structure

### TypeScript (Public API)

- `src/index.ts` -- Main AppDNA class with all static async methods; NativeModules/NativeEventEmitter setup
- `src/types.ts` -- TypeScript type definitions (WebEntitlement, DeferredDeepLink, PaywallContext, AppDNAOptions)

### iOS Bridge

- `ios/AppdnaModule.swift` -- RCTEventEmitter subclass implementing all @objc methods; delegates to native `AppDNA` singleton; emits `onWebEntitlementChanged` events
- `ios/AppdnaModule.m` -- Objective-C bridge header for React Native module registration

### Android Bridge

- `android/src/main/java/com/appdna/rn/AppdnaModule.kt` -- ReactContextBaseJavaModule implementing all @ReactMethod functions; delegates to native `AppDNA` singleton; emits `onWebEntitlementChanged` events
- `android/src/main/java/com/appdna/rn/AppdnaPackage.kt` -- ReactPackage registration

### Example

- `example/App.tsx` -- Example React Native app demonstrating SDK usage

---

## Backend Module Dependencies

All backend dependencies are inherited from the native iOS and Android SDKs:

- **monetization**: paywall configs (via native SDK)
- **onboarding**: onboarding flow configs (via native SDK)
- **experiments**: experiment configs (via native SDK)
- **feature-flags**: feature flags (via native SDK)
- **feedback**: survey configs and responses (via native SDK)
- **web-entitlements**: web entitlements (via native SDK)
- **deep-links**: deferred deep links (via native SDK)
- **ingest**: event ingestion (via native SDK)
- **sdk-bootstrap**: bootstrap (via native SDK)

---

## Rule

Any new module feature that writes config to Firestore or adds new events MUST update this SDK. For React Native, this means:
1. Add a new async method in `src/index.ts`
2. Add the corresponding type in `src/types.ts` (if new data model)
3. Add the corresponding `@objc` method in `ios/AppdnaModule.swift`
4. Add the corresponding `@ReactMethod` function in `android/src/main/java/com/appdna/rn/AppdnaModule.kt`
