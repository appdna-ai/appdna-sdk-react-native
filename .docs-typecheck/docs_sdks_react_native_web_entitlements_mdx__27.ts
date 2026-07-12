
import { AppDNA } from '@appdna-ai/react-native-sdk';

const entitlement = await AppDNA.getWebEntitlement();
if (entitlement && entitlement.isActive) {
  // User has an active web subscription
  unlockPremium();
  console.log(`Plan: ${entitlement.planName ?? 'unknown'}, Status: ${entitlement.status}`);
  if (entitlement.currentPeriodEnd) {
    console.log(`Renews: ${entitlement.currentPeriodEnd}`);
  }
}

export {};
