
type AppDNAEnvironment = 'production' | 'staging';

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAEnvironment = __Assert<__Same<keyof AppDNAEnvironment, keyof import('@appdna-ai/react-native-sdk').AppDNAEnvironment>>;
type __o_AppDNAEnvironment = __Assert<__Same<__OptKeys<AppDNAEnvironment>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAEnvironment>>>;
type __p_AppDNAEnvironment = __Assert<__Same<__Params<AppDNAEnvironment>, __Params<import('@appdna-ai/react-native-sdk').AppDNAEnvironment>>>;
type __r_AppDNAEnvironment = __Assert<__Same<__Returns<AppDNAEnvironment>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAEnvironment>>>;

export {};
