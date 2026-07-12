import { AppDNA } from '@appdna-ai/react-native-sdk';
// Suppress during purchase flow
await AppDNA.inAppMessages.suppressDisplay(true);
startPurchaseFlow();

// Resume after purchase completes
async function onPurchaseComplete(): Promise<void> {
  await AppDNA.inAppMessages.suppressDisplay(false);
}

export {};
