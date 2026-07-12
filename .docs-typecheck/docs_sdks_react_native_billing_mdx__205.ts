
interface AppDNABillingDelegate {
  onPurchaseCompleted(productId: string, transaction: Record<string, unknown>): void;
  onPurchaseFailed(productId: string, error: Error): void;
  onEntitlementsChanged(entitlements: string[]): void;
  onRestoreCompleted(restoredProductIds: string[]): void;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNABillingDelegate = __Assert<__Same<keyof AppDNABillingDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNABillingDelegate>>;
type __o_AppDNABillingDelegate = __Assert<__Same<__OptKeys<AppDNABillingDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNABillingDelegate>>>;
type __p_AppDNABillingDelegate = __Assert<__Same<__Params<AppDNABillingDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNABillingDelegate>>>;
type __r_AppDNABillingDelegate = __Assert<__Same<__Returns<AppDNABillingDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNABillingDelegate>>>;

export {};
