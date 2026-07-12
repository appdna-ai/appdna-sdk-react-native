import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.onWebEntitlementChanged((entitlement) => {
  if (entitlement?.isActive === true) {
    unlockPremium();
  } else {
    lockPremium();
  }
});

// Remember to unsubscribe when no longer needed
// unsubscribe();

export {};
