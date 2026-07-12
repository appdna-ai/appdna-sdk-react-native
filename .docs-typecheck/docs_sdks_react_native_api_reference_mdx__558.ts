
interface ProductInfo {
  id: string;
  name: string;
  description: string;
  displayPrice: string;      // Localized, store-formatted price — the string to render
  priceMicros: number;       // Price × 1,000,000, as an integer ($9.99 → 9990000)
  currencyCode?: string;     // ISO-4217. Android only
  isSubscription?: boolean;  // iOS only
  offerToken?: string;       // Android only — base-plan offer token, pass back to purchase()
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_ProductInfo = __Assert<__Same<keyof ProductInfo, keyof import('@appdna-ai/react-native-sdk').ProductInfo>>;
type __o_ProductInfo = __Assert<__Same<__OptKeys<ProductInfo>, __OptKeys<import('@appdna-ai/react-native-sdk').ProductInfo>>>;
type __p_ProductInfo = __Assert<__Same<__Params<ProductInfo>, __Params<import('@appdna-ai/react-native-sdk').ProductInfo>>>;
type __r_ProductInfo = __Assert<__Same<__Returns<ProductInfo>, __Returns<import('@appdna-ai/react-native-sdk').ProductInfo>>>;

export {};
