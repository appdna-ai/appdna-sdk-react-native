
interface TransactionInfo {
  transactionId: string;   // App Store / Play transaction identifier
  productId: string;
  purchaseDate: string;    // ISO 8601
  environment: string;     // 'production' | 'sandbox'
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_TransactionInfo = __Assert<__Same<keyof TransactionInfo, keyof import('@appdna-ai/react-native-sdk').TransactionInfo>>;
type __o_TransactionInfo = __Assert<__Same<__OptKeys<TransactionInfo>, __OptKeys<import('@appdna-ai/react-native-sdk').TransactionInfo>>>;
type __p_TransactionInfo = __Assert<__Same<__Params<TransactionInfo>, __Params<import('@appdna-ai/react-native-sdk').TransactionInfo>>>;
type __r_TransactionInfo = __Assert<__Same<__Returns<TransactionInfo>, __Returns<import('@appdna-ai/react-native-sdk').TransactionInfo>>>;

export {};
