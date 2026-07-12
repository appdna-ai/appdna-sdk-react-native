import { AppDNA } from '@appdna-ai/react-native-sdk'; import type { Entitlement, AppDNABillingDelegate } from '@appdna-ai/react-native-sdk';
const billingHandler: AppDNABillingDelegate = {
  onPurchaseCompleted(productId, transaction) {
    console.log(`Purchased: ${productId}`);
    // Unlock premium features
  },

  onPurchaseFailed(productId, error) {
    // `error.message` is usually a JSON blob `{"message":"...","type":"..."}` from
    // native or a plain string. Parse / stringify when displaying.
    console.log(`Purchase failed: ${productId} -- ${error.message}`);
    // Show error message to user
  },

  onEntitlementsChanged(entitlements) {
    console.log(`Entitlement product IDs: ${entitlements.join(', ')}`);
    // For full entitlement objects (status, expiry, trial), call:
    //   const ents = await AppDNA.billing.getEntitlements();
  },

  onRestoreCompleted(restoredProductIds) {
    console.log(`Restored ${restoredProductIds.length} products`);
  },
};

AppDNA.billing.setDelegate(billingHandler);

export {};
