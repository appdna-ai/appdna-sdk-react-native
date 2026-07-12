import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.billing.onEntitlementsChanged((entitlements) => {
  console.log(`Entitlements changed: ${entitlements.length} active`);
  // Update UI to reflect new entitlement state
});

// Later, when you no longer need updates:
unsubscribe();

export {};
