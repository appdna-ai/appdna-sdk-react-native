import { AppDNA } from '@appdna-ai/react-native-sdk'; import type { AppDNAPaywallDelegate } from '@appdna-ai/react-native-sdk';
const paywallHandler: AppDNAPaywallDelegate = {
  onPaywallPresented(paywallId) {},

  onPaywallAction(paywallId, action) {
    // action is one of: cta_tapped, feature_selected, plan_changed, link_tapped, custom
  },

  onPaywallPurchaseStarted(paywallId, productId) {},

  onPaywallPurchaseCompleted(paywallId, productId, transaction) {
    console.log(`Purchased ${productId} — txn:`, transaction.transactionId);
    // Paywall auto-dismisses on successful purchase
  },

  onPaywallPurchaseFailed(paywallId, error) {
    console.log('Purchase failed:', error);
  },

  onPaywallRestoreStarted(paywallId) {
    // Show a "Restoring purchases…" toast
  },

  onPaywallRestoreCompleted(paywallId, restoredProductIds) {
    if (restoredProductIds.length === 0) {
      // Tell the user there were no purchases to restore
    } else {
      // Refresh entitlements / unlock premium features
    }
  },

  onPaywallRestoreFailed(paywallId, error) {
    // Surface an error toast — paywall stays visible so user can retry
  },

  onPaywallDismissed(paywallId) {},
};

AppDNA.paywall.setDelegate(paywallHandler);

export {};
