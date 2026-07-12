import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.billing.onEntitlementsChanged((entitlements) => {
  const active = entitlements.filter((e) => e.status === 'active');
  console.log(`Active entitlements: ${active.length}`);
});

export {};
