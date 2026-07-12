import { AppDNA } from '@appdna-ai/react-native-sdk';
// Current value (one-shot Promise)
const webEntitlement = await AppDNA.getWebEntitlement();

// Live subscription of changes (returns an unsubscribe function)
const unsubscribe = AppDNA.onWebEntitlementChanged((entitlement) => { /* ... */ });

export {};
