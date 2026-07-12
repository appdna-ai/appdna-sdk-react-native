import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.identify('user_abc', { plan: 'free' });
// Native entitlement cache is refreshed in the background.
// The next paywall_trigger node will see the updated state.

export {};
