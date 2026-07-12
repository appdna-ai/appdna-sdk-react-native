
interface Entitlement {
  productId: string;
  store: string;           // e.g. 'app_store', 'play_store'
  status: string;          // e.g. 'active', 'expired'
  expiresAt: string | null; // ISO 8601 timestamp
  isTrial: boolean;
  offerType: string | null; // e.g. 'introductory'
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_Entitlement = __Assert<__Same<keyof Entitlement, keyof import('@appdna-ai/react-native-sdk').Entitlement>>;
type __o_Entitlement = __Assert<__Same<__OptKeys<Entitlement>, __OptKeys<import('@appdna-ai/react-native-sdk').Entitlement>>>;
type __p_Entitlement = __Assert<__Same<__Params<Entitlement>, __Params<import('@appdna-ai/react-native-sdk').Entitlement>>>;
type __r_Entitlement = __Assert<__Same<__Returns<Entitlement>, __Returns<import('@appdna-ai/react-native-sdk').Entitlement>>>;

export {};
