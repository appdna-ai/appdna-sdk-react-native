import { AppDNA } from '@appdna-ai/react-native-sdk'; import type { AppDNAPaywallDelegate } from '@appdna-ai/react-native-sdk';
const paywallDelegate: AppDNAPaywallDelegate = {
  // ... other 8 AppDNAPaywallDelegate methods

  onPaywallRestoreCompleted(paywallId, restoredProductIds) {
    if (restoredProductIds.length > 0) {
      console.log(`Restored ${restoredProductIds.length} product(s) — SDK is dismissing the paywall.`);
    } else {
      console.log('Restore returned no entitlements — paywall stays open.');
    }
  },
};

AppDNA.paywall.setDelegate(paywallDelegate);

export {};
