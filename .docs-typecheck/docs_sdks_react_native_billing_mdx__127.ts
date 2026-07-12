import { AppDNA } from '@appdna-ai/react-native-sdk';
const restoredProductIds = await AppDNA.billing.restorePurchases();

for (const productId of restoredProductIds) {
  console.log(`Restored: ${productId}`);
}

// For the entitlement objects themselves (status, expiry, trial):
const entitlements = await AppDNA.billing.getEntitlements();

export {};
