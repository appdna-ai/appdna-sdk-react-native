
type AppDNABillingProvider = 'storeKit2' | 'revenueCat' | 'adapty' | 'none';

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNABillingProvider = __Assert<__Same<keyof AppDNABillingProvider, keyof import('@appdna-ai/react-native-sdk').AppDNABillingProvider>>;
type __o_AppDNABillingProvider = __Assert<__Same<__OptKeys<AppDNABillingProvider>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNABillingProvider>>>;
type __p_AppDNABillingProvider = __Assert<__Same<__Params<AppDNABillingProvider>, __Params<import('@appdna-ai/react-native-sdk').AppDNABillingProvider>>>;
type __r_AppDNABillingProvider = __Assert<__Same<__Returns<AppDNABillingProvider>, __Returns<import('@appdna-ai/react-native-sdk').AppDNABillingProvider>>>;

export {};
