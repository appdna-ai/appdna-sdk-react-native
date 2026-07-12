
import { AppDNA, type AppDNAPaywallDelegate } from '@appdna-ai/react-native-sdk';

const delegate: AppDNAPaywallDelegate = {
  onPaywallPresented: () => {},
  onPaywallAction: () => {},
  onPaywallPurchaseStarted: () => {},
  onPaywallPurchaseCompleted: (paywallId, productId) => console.log('Purchased', productId),
  // `error` is a message string, and `errorType` is the stable reason code
  // (userCancelled | networkError | serverError | …). `productId` is null if none was selected.
  onPaywallPurchaseFailed: (paywallId, error, errorType) => console.log('Failed:', errorType, error),
  onPaywallRestoreStarted: () => {},
  onPaywallRestoreCompleted: () => {},
  onPaywallRestoreFailed: () => {},
  onPostPurchaseDeepLink: () => {},
  onPostPurchaseNextStep: () => {},
  onPaywallDismissed: () => {},
};

AppDNA.paywall.setDelegate(delegate);
await AppDNA.paywall.present('default', { placement: 'settings' });

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAPaywallDelegate = __Assert<__Same<keyof AppDNAPaywallDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>;
type __o_AppDNAPaywallDelegate = __Assert<__Same<__OptKeys<AppDNAPaywallDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;
type __p_AppDNAPaywallDelegate = __Assert<__Same<__Params<AppDNAPaywallDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;
type __r_AppDNAPaywallDelegate = __Assert<__Same<__Returns<AppDNAPaywallDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;

export {};
