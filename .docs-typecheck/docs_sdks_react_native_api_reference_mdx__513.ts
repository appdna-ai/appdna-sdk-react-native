
interface PushPayload {
  pushId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  actionType?: string;
  actionValue?: string;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_PushPayload = __Assert<__Same<keyof PushPayload, keyof import('@appdna-ai/react-native-sdk').PushPayload>>;
type __o_PushPayload = __Assert<__Same<__OptKeys<PushPayload>, __OptKeys<import('@appdna-ai/react-native-sdk').PushPayload>>>;
type __p_PushPayload = __Assert<__Same<__Params<PushPayload>, __Params<import('@appdna-ai/react-native-sdk').PushPayload>>>;
type __r_PushPayload = __Assert<__Same<__Returns<PushPayload>, __Returns<import('@appdna-ai/react-native-sdk').PushPayload>>>;

export {};
