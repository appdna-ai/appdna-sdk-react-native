import { AppDNA } from '@appdna-ai/react-native-sdk'; import type { AppDNAPaywallDelegate } from '@appdna-ai/react-native-sdk';
const paywallDelegate: AppDNAPaywallDelegate = {
  // ... other 8 methods

  onPaywallRestoreCompleted(paywallId, productIds) {
    // Your custom UI handling — show overlay, etc.
    // No need to dismiss anything yourself: the SDK's auto-dismiss path
    // runs once your body returns. (Earlier revisions of this page told
    // you to call `AppDNA.paywall.dismiss()` — no such method has ever
    // existed on any platform. There is no host-callable paywall dismiss;
    // the SDK owns the paywall's lifecycle.)
  },
};

export {};
