import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsub1 = AppDNA.paywall.onPresented((paywallId) => { });
const unsub2 = AppDNA.paywall.onDismissed((paywallId, action) => { });

// Clean up when no longer needed
unsub1();
unsub2();

export {};
