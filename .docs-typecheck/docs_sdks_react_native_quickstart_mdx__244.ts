import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.onWebEntitlementChanged((ent) => {
  console.log('Web entitlement changed:', ent);
});

export {};
