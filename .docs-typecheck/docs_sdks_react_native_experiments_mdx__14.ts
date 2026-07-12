
import { AppDNA } from '@appdna-ai/react-native-sdk';

const variant = await AppDNA.experiments.getVariant('paywall-test');

switch (variant) {
  case 'control':
    showStandardPaywall();
    break;
  case 'variant_a':
    showNewPaywall();
    break;
  default:
    // null, archived, or user not in audience — always handle this branch.
    showStandardPaywall();
}

export {};
