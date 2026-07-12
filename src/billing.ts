import {
  AppdnaModule as AppdnaBillingModule,
  addNativeListener,
  setDelegateListeners,
} from './nativeModule';
import type { AppDNABillingDelegate } from './generated/delegates';

/**
 * N11 — the wire shape is the **union** of the iOS and Android entitlement models, with the keys the
 * running platform has no concept of **omitted, never faked**. `isActive` is synthesised on Android
 * from `status`; dates cross as ISO-8601 strings.
 */
export type Entitlement = {
  productId: string;
  store: string;
  status: string;
  expiresAt: string | null;
  isTrial: boolean;
  offerType: string | null;
};

/**
 * What a **successful** `purchase()` resolves with — the store transaction, exactly as both native
 * mappers emit it (`AppdnaMappers.map(_ tx:)` / `AppdnaMappers.map(tx:)`).
 *
 * It replaces a `PurchaseResult = {status, entitlement?}` union that no native has ever produced.
 * That type was fiction in both directions: `result.status === 'purchased'` was ALWAYS false after a
 * successful buy, `result.entitlement` was always `undefined`, and the other three statuses were
 * unreachable because a cancel / pending / failure **throws** natively and arrives here as a promise
 * REJECTION, never as a resolved value. Every `switch (result.status)` a host wrote fell through to
 * `default`.
 *
 * There is no `status` field because there is nothing for it to say: a resolved promise IS
 * "purchased", and anything else rejected.
 */
export type TransactionInfo = {
  /** App Store / Play transaction identifier. */
  transactionId: string;
  productId: string;
  /** ISO-8601. Android stores it as a string; iOS formats its `Date` to the same shape. */
  purchaseDate: string;
  /** `production` | `sandbox` (iOS also reports `xcode`). */
  environment: string;
};

/**
 * A store product, as the two mappers emit it.
 *
 * ⚠ There is no `price: number`. Neither mapper has ever emitted one — both send **`priceMicros`**
 * (an integer: `9.99` → `9_990_000`), because iOS's native price is a `Decimal`, which is not
 * bridge-legal, and shipping it as a lossy `Double` would be worse than an integer both platforms
 * agree on. A host that wrote `product.price.toFixed(2)` against the old type crashed on
 * `undefined`; show `displayPrice` (already localized and currency-formatted) or divide
 * `priceMicros` by 1e6.
 *
 * The platform-specific keys are **omitted, never faked** (N11): an absent key means "this platform
 * has no concept of it".
 */
export type ProductInfo = {
  id: string;
  name: string;
  description: string;
  /** Localized, store-formatted price — e.g. "$9.99". The string to render. */
  displayPrice: string;
  /** Price × 1,000,000, as an integer. Both platforms. */
  priceMicros: number;
  /** ISO-4217. **Android only** — iOS's `ProductInfo` does not expose a currency code. */
  currencyCode?: string;
  /** **iOS only** — Play's `ProductDetails` does not surface this on the DTO. */
  isSubscription?: boolean;
  /** **Android only** — the base-plan offer token to pass back to `purchase()`. */
  offerToken?: string;
};

/**
 * The native `onEntitlementsChanged` payload. Events cross as objects — a bare array is not a legal
 * TurboModule event payload — so the facade unwraps once, here, rather than at four call sites that
 * each guessed differently.
 */
type EntitlementsChangedPayload = { entitlements: Entitlement[] };

/**
 * The core SDK only attaches its entitlement observer when the wrapper asks it to, so the first JS
 * listener has to start it. Idempotent on the native side; the flag just avoids the bridge hop.
 */
let entitlementObserverStarted = false;

function ensureEntitlementObserver(): void {
  if (entitlementObserverStarted) return;
  entitlementObserverStarted = true;
  // Fire-and-forget: a rejection here means billing is unavailable, which the host learns from
  // `onBillingUnavailable`. Swallowing it would hide nothing that is not already reported.
  void AppdnaBillingModule.startEntitlementObserver();
}

/** Test seam: forget that the observer was started, so a suite can assert the first-listener call. */
/**
 * Forget that the observer was started. Called by `shutdown()`.
 *
 * The latch below is what stops a re-subscribe storm — but it also meant that after
 * `shutdown()` → `configure()`, `startEntitlementObserver()` was never re-sent to native and
 * `onEntitlementsChanged` stayed dead for the rest of the process. The JS mirror of the Android
 * native defect where the same subscription was dropped.
 */
export function resetEntitlementObserver(): void {
  entitlementObserverStarted = false;
}

export function __resetEntitlementObserverForTesting(): void {
  entitlementObserverStarted = false;
}

/**
 * Billing bridge for AppDNA in-app purchases.
 *
 * Provides purchase, restore, product info, and entitlement streaming
 * via native modules that delegate to iOS/Android SDKs.
 */
export class AppDNABilling {
  /**
   * Purchase a product by its store product ID.
   * On Android, pass offerToken for subscription offers (base plan tokens).
   *
   * Resolves with the {@link TransactionInfo} on success. A user cancellation, a pending
   * (deferred / ask-to-buy) purchase, and a store failure all **reject** — natively they throw, and
   * the wrapper surfaces that as `PURCHASE_ERROR`. Catch the rejection; do not test a status field.
   */
  static async purchase(
    productId: string,
    offerToken?: string
  ): Promise<TransactionInfo> {
    return AppdnaBillingModule.purchase(productId, offerToken) as Promise<TransactionInfo>;
  }

  /**
   * Restore previously purchased products.
   * Syncs with the App Store / Google Play and returns the restored product IDs.
   */
  static async restorePurchases(): Promise<string[]> {
    return AppdnaBillingModule.restorePurchases() as Promise<string[]>;
  }

  /**
   * Get localized product information from the store.
   * Pass a list of product IDs configured in App Store Connect / Google Play Console.
   */
  static async getProducts(productIds: string[]): Promise<ProductInfo[]> {
    return AppdnaBillingModule.getProducts(productIds) as Promise<ProductInfo[]>;
  }

  /**
   * Check if the user has an active subscription.
   */
  static async hasActiveSubscription(): Promise<boolean> {
    return AppdnaBillingModule.hasActiveSubscription();
  }

  /**
   * Listen for entitlement changes (purchases, renewals, revocations).
   * Returns an unsubscribe function.
   */
  static onEntitlementsChanged(
    callback: (entitlements: Entitlement[]) => void
  ): () => void {
    ensureEntitlementObserver();
    const sub = addNativeListener<EntitlementsChangedPayload>('onEntitlementsChanged', (data) =>
      callback(data.entitlements ?? []),
    );
    return () => sub.remove();
  }

  /**
   * Get all current entitlements for the user.
   */
  static async getEntitlements(): Promise<Entitlement[]> {
    return AppdnaBillingModule.getEntitlements() as Promise<Entitlement[]>;
  }

  /**
   * Set a delegate to receive billing lifecycle callbacks.
   */
  static setDelegate(delegate: Partial<AppDNABillingDelegate>): void {
    // Replaces the previous delegate's listeners. Without this, a remount stacked another set and one
    // `onPurchaseCompleted` invoked every delegate ever registered — N entitlement grants for one buy.
    setDelegateListeners('billing', () => {
      const subs = [];
      if (delegate.onPurchaseCompleted) {
        subs.push(addNativeListener<{ productId: string; transaction: Record<string, unknown> }>(
          'onPurchaseCompleted',
          (data) => delegate.onPurchaseCompleted!(data.productId, data.transaction ?? {}),
        ));
      }
      if (delegate.onPurchaseFailed) {
        subs.push(addNativeListener<{ productId: string; error: string }>('onPurchaseFailed', (data) =>
          delegate.onPurchaseFailed!(data.productId, data.error),
        ));
      }
      if (delegate.onEntitlementsChanged) {
        ensureEntitlementObserver();
        subs.push(addNativeListener<EntitlementsChangedPayload>('onEntitlementsChanged', (data) =>
          delegate.onEntitlementsChanged!(data.entitlements ?? []),
        ));
      }
      if (delegate.onRestoreCompleted) {
        subs.push(addNativeListener<{ restoredProducts: string[] }>('onRestoreCompleted', (data) =>
          delegate.onRestoreCompleted!(data.restoredProducts ?? []),
        ));
      }
      if (delegate.onBillingUnavailable) {
        // N8 — Android-only. iOS's billing protocol has no such method, so this listener is registered
        // on both platforms and fires on one. Documented rather than faked.
        subs.push(addNativeListener('onBillingUnavailable', () => delegate.onBillingUnavailable!()));
      }
      return subs;
    });
  }
}
