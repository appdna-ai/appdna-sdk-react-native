import { AppDNA } from '@appdna-ai/react-native-sdk';
const active = await AppDNA.billing.hasActiveSubscription();

if (active) {
  // Unlock premium features
}

export {};
