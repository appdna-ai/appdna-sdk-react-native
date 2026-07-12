
interface DeferredDeepLink {
  screen: string;
  params: Record<string, string>;
  visitorId: string;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_DeferredDeepLink = __Assert<__Same<keyof DeferredDeepLink, keyof import('@appdna-ai/react-native-sdk').DeferredDeepLink>>;
type __o_DeferredDeepLink = __Assert<__Same<__OptKeys<DeferredDeepLink>, __OptKeys<import('@appdna-ai/react-native-sdk').DeferredDeepLink>>>;
type __p_DeferredDeepLink = __Assert<__Same<__Params<DeferredDeepLink>, __Params<import('@appdna-ai/react-native-sdk').DeferredDeepLink>>>;
type __r_DeferredDeepLink = __Assert<__Same<__Returns<DeferredDeepLink>, __Returns<import('@appdna-ai/react-native-sdk').DeferredDeepLink>>>;

export {};
