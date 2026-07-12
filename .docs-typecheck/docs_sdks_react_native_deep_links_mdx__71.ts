
interface AppDNADeepLinkDelegate {
  /** Veto. Return false to suppress deep-link processing. */
  shouldOpen(url: string, params: Record<string, unknown>): boolean;

  onDeepLinkReceived(url: string, params: Record<string, unknown>): void;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNADeepLinkDelegate = __Assert<__Same<keyof AppDNADeepLinkDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNADeepLinkDelegate>>;
type __o_AppDNADeepLinkDelegate = __Assert<__Same<__OptKeys<AppDNADeepLinkDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNADeepLinkDelegate>>>;
type __p_AppDNADeepLinkDelegate = __Assert<__Same<__Params<AppDNADeepLinkDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNADeepLinkDelegate>>>;
type __r_AppDNADeepLinkDelegate = __Assert<__Same<__Returns<AppDNADeepLinkDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNADeepLinkDelegate>>>;

export {};
