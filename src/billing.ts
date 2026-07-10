import { AppdnaModule as AppdnaBillingModule, addNativeListener } from './nativeModule';
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

export type PurchaseResult = {
  status: 'purchased' | 'cancelled' | 'pending' | 'unknown';
  entitlement?: Entitlement;
};

export type ProductInfo = {
  id: string;
  name: string;
  description: string;
  displayPrice: string;
  price: number;
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
   */
  static async purchase(
    productId: string,
    offerToken?: string
  ): Promise<PurchaseResult> {
    return AppdnaBillingModule.purchase(productId, offerToken) as Promise<PurchaseResult>;
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
    if (delegate.onPurchaseCompleted) {
      addNativeListener<{ productId: string; transaction: Record<string, unknown> }>(
        'onPurchaseCompleted',
        (data) => delegate.onPurchaseCompleted!(data.productId, data.transaction ?? {}),
      );
    }
    if (delegate.onPurchaseFailed) {
      addNativeListener<{ productId: string; error: string }>('onPurchaseFailed', (data) =>
        delegate.onPurchaseFailed!(data.productId, data.error),
      );
    }
    if (delegate.onEntitlementsChanged) {
      ensureEntitlementObserver();
      addNativeListener<EntitlementsChangedPayload>('onEntitlementsChanged', (data) =>
        delegate.onEntitlementsChanged!(data.entitlements ?? []),
      );
    }
    if (delegate.onRestoreCompleted) {
      addNativeListener<{ restoredProducts: string[] }>('onRestoreCompleted', (data) =>
        delegate.onRestoreCompleted!(data.restoredProducts ?? []),
      );
    }
    if (delegate.onBillingUnavailable) {
      // N8 — Android-only. iOS's billing protocol has no such method, so this listener is registered
      // on both platforms and fires on one. Documented rather than faked.
      addNativeListener('onBillingUnavailable', () => delegate.onBillingUnavailable!());
    }
  }
}
