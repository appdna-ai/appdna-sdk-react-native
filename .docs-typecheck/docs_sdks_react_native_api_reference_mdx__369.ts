import type { AppDNALogLevel, AppDNABillingProvider } from '@appdna-ai/react-native-sdk';
interface AppDNAOptions {
  flushInterval?: number;                 // Default: 30 (seconds)
  batchSize?: number;                     // Default: 20
  configTTL?: number;                     // Default: 3600 (seconds)
  logLevel?: AppDNALogLevel;              // Default: 'warning'
  billingProvider?: AppDNABillingProvider; // Default: 'storeKit2' (iOS)
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAOptions = __Assert<__Same<keyof AppDNAOptions, keyof import('@appdna-ai/react-native-sdk').AppDNAOptions>>;
type __o_AppDNAOptions = __Assert<__Same<__OptKeys<AppDNAOptions>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAOptions>>>;
type __p_AppDNAOptions = __Assert<__Same<__Params<AppDNAOptions>, __Params<import('@appdna-ai/react-native-sdk').AppDNAOptions>>>;
type __r_AppDNAOptions = __Assert<__Same<__Returns<AppDNAOptions>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAOptions>>>;

export {};
