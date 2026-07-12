import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.paywall.present('premium_paywall', { placement: 'feature_gate' });

export {};
