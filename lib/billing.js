import { NativeModules, NativeEventEmitter } from 'react-native';
const { AppdnaModule: AppdnaBillingModule } = NativeModules;
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
    static async purchase(productId, offerToken) {
        return AppdnaBillingModule.purchase(productId, offerToken ?? null);
    }
    /**
     * Restore previously purchased products.
     * Syncs with the App Store / Google Play and returns all active entitlements.
     */
    static async restorePurchases() {
        return AppdnaBillingModule.restorePurchases();
    }
    /**
     * Get localized product information from the store.
     * Pass a list of product IDs configured in App Store Connect / Google Play Console.
     */
    static async getProducts(productIds) {
        return AppdnaBillingModule.getProducts(productIds);
    }
    /**
     * Check if the user has an active subscription.
     */
    static async hasActiveSubscription() {
        return AppdnaBillingModule.hasActiveSubscription();
    }
    /**
     * Listen for entitlement changes (purchases, renewals, revocations).
     * Returns an unsubscribe function.
     */
    static onEntitlementsChanged(callback) {
        const sub = eventEmitter.addListener('onEntitlementsChanged', callback);
        return () => sub.remove();
    }
    /**
     * Get all current entitlements for the user.
     */
    static async getEntitlements() {
        return AppdnaBillingModule.getEntitlements();
    }
    /**
     * Set a delegate to receive billing lifecycle callbacks.
     */
    static setDelegate(delegate) {
        const emitter = new NativeEventEmitter(AppdnaBillingModule);
        if (delegate.onPurchaseCompleted) {
            emitter.addListener('onPurchaseCompleted', (data) => delegate.onPurchaseCompleted(data.productId, data.transaction ?? {}));
        }
        if (delegate.onPurchaseFailed) {
            emitter.addListener('onPurchaseFailed', (data) => delegate.onPurchaseFailed(data.productId, data.error));
        }
        if (delegate.onEntitlementsChanged) {
            emitter.addListener('onEntitlementsChanged', (entitlements) => delegate.onEntitlementsChanged(entitlements));
        }
        if (delegate.onRestoreCompleted) {
            emitter.addListener('onRestoreCompleted', (data) => delegate.onRestoreCompleted(data.restoredProducts ?? []));
        }
    }
}
//# sourceMappingURL=billing.js.map