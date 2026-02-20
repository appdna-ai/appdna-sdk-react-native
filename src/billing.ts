import { NativeModules, NativeEventEmitter } from 'react-native';

const { AppdnaModule: AppdnaBillingModule } = NativeModules;

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

const eventEmitter = new NativeEventEmitter(AppdnaBillingModule);

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
    return AppdnaBillingModule.purchase(productId, offerToken ?? null);
  }

  /**
   * Restore previously purchased products.
   * Syncs with the App Store / Google Play and returns all active entitlements.
   */
  static async restorePurchases(): Promise<Entitlement[]> {
    return AppdnaBillingModule.restorePurchases();
  }

  /**
   * Get localized product information from the store.
   * Pass a list of product IDs configured in App Store Connect / Google Play Console.
   */
  static async getProducts(productIds: string[]): Promise<ProductInfo[]> {
    return AppdnaBillingModule.getProducts(productIds);
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
    const sub = eventEmitter.addListener('onEntitlementsChanged', callback);
    return () => sub.remove();
  }

  /**
   * Get all current entitlements for the user.
   */
  static async getEntitlements(): Promise<Entitlement[]> {
    return AppdnaBillingModule.getEntitlements();
  }

  /**
   * Set a delegate to receive billing lifecycle callbacks.
   */
  static setDelegate(delegate: {
    onPurchaseCompleted?(productId: string, transaction: Record<string, unknown>): void;
    onPurchaseFailed?(productId: string, error: string): void;
    onEntitlementsChanged?(entitlements: Entitlement[]): void;
    onRestoreCompleted?(restoredProducts: string[]): void;
  }): void {
    const emitter = new NativeEventEmitter(AppdnaBillingModule);
    if (delegate.onPurchaseCompleted) {
      emitter.addListener('onPurchaseCompleted', (data: { productId: string; transaction: Record<string, unknown> }) =>
        delegate.onPurchaseCompleted!(data.productId, data.transaction ?? {}));
    }
    if (delegate.onPurchaseFailed) {
      emitter.addListener('onPurchaseFailed', (data: { productId: string; error: string }) =>
        delegate.onPurchaseFailed!(data.productId, data.error));
    }
    if (delegate.onEntitlementsChanged) {
      emitter.addListener('onEntitlementsChanged', (entitlements: Entitlement[]) =>
        delegate.onEntitlementsChanged!(entitlements));
    }
    if (delegate.onRestoreCompleted) {
      emitter.addListener('onRestoreCompleted', (data: { restoredProducts: string[] }) =>
        delegate.onRestoreCompleted!(data.restoredProducts ?? []));
    }
  }
}
