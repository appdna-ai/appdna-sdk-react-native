
interface WebEntitlement {
  isActive: boolean;
  planName: string | null;
  priceId: string | null;
  interval: string | null;       // e.g. 'month', 'year'
  status: string;                // e.g. 'active', 'canceled', 'trialing'
  currentPeriodEnd: string | null; // ISO 8601
  trialEnd: string | null;          // ISO 8601
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_WebEntitlement = __Assert<__Same<keyof WebEntitlement, keyof import('@appdna-ai/react-native-sdk').WebEntitlement>>;
type __o_WebEntitlement = __Assert<__Same<__OptKeys<WebEntitlement>, __OptKeys<import('@appdna-ai/react-native-sdk').WebEntitlement>>>;
type __p_WebEntitlement = __Assert<__Same<__Params<WebEntitlement>, __Params<import('@appdna-ai/react-native-sdk').WebEntitlement>>>;
type __r_WebEntitlement = __Assert<__Same<__Returns<WebEntitlement>, __Returns<import('@appdna-ai/react-native-sdk').WebEntitlement>>>;

export {};
