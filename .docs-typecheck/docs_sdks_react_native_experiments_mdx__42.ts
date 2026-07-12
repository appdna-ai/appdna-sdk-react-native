import { AppDNA } from '@appdna-ai/react-native-sdk';
if (await AppDNA.experiments.isInVariant('paywall-test', 'variant_a')) {
  showNewPaywall();
} else {
  showStandardPaywall();
}

export {};
