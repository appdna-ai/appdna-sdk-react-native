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
 * Billing bridge for AppDNA in-app purchases.
 *
 * Provides purchase, restore, product info, and entitlement streaming
 * via native modules that delegate to iOS/Android SDKs.
 */
export declare class AppDNABilling {
    /**
     * Purchase a product by its store product ID.
     * On Android, pass offerToken for subscription offers (base plan tokens).
     */
    static purchase(productId: string, offerToken?: string): Promise<PurchaseResult>;
    /**
     * Restore previously purchased products.
     * Syncs with the App Store / Google Play and returns all active entitlements.
     */
    static restorePurchases(): Promise<Entitlement[]>;
    /**
     * Get localized product information from the store.
     * Pass a list of product IDs configured in App Store Connect / Google Play Console.
     */
    static getProducts(productIds: string[]): Promise<ProductInfo[]>;
    /**
     * Check if the user has an active subscription.
     */
    static hasActiveSubscription(): Promise<boolean>;
    /**
     * Listen for entitlement changes (purchases, renewals, revocations).
     * Returns an unsubscribe function.
     */
    static onEntitlementsChanged(callback: (entitlements: Entitlement[]) => void): () => void;
    /**
     * Get all current entitlements for the user.
     */
    static getEntitlements(): Promise<Entitlement[]>;
    /**
     * Set a delegate to receive billing lifecycle callbacks.
     */
    static setDelegate(delegate: {
        onPurchaseCompleted?(productId: string, transaction: Record<string, unknown>): void;
        onPurchaseFailed?(productId: string, error: string): void;
        onEntitlementsChanged?(entitlements: Entitlement[]): void;
        onRestoreCompleted?(restoredProducts: string[]): void;
    }): void;
}
//# sourceMappingURL=billing.d.ts.map