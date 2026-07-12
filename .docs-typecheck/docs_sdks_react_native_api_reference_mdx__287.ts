
interface AppDNAPushDelegate {
  onPushTokenRegistered(token: string): void;
  onPushReceived(notification: Record<string, unknown>, inForeground: boolean): void;
  onPushTapped(notification: Record<string, unknown>, actionId: string | null): void;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAPushDelegate = __Assert<__Same<keyof AppDNAPushDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAPushDelegate>>;
type __o_AppDNAPushDelegate = __Assert<__Same<__OptKeys<AppDNAPushDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAPushDelegate>>>;
type __p_AppDNAPushDelegate = __Assert<__Same<__Params<AppDNAPushDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAPushDelegate>>>;
type __r_AppDNAPushDelegate = __Assert<__Same<__Returns<AppDNAPushDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAPushDelegate>>>;

export {};
