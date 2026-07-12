
type AppDNALogLevel = 'none' | 'error' | 'warning' | 'info' | 'debug';

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNALogLevel = __Assert<__Same<keyof AppDNALogLevel, keyof import('@appdna-ai/react-native-sdk').AppDNALogLevel>>;
type __o_AppDNALogLevel = __Assert<__Same<__OptKeys<AppDNALogLevel>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNALogLevel>>>;
type __p_AppDNALogLevel = __Assert<__Same<__Params<AppDNALogLevel>, __Params<import('@appdna-ai/react-native-sdk').AppDNALogLevel>>>;
type __r_AppDNALogLevel = __Assert<__Same<__Returns<AppDNALogLevel>, __Returns<import('@appdna-ai/react-native-sdk').AppDNALogLevel>>>;

export {};
