
interface PaywallContext {
  placement?: string;
  experiment?: string;
  variant?: string;
  customData?: Record<string, unknown>;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_PaywallContext = __Assert<__Same<keyof PaywallContext, keyof import('@appdna-ai/react-native-sdk').PaywallContext>>;
type __o_PaywallContext = __Assert<__Same<__OptKeys<PaywallContext>, __OptKeys<import('@appdna-ai/react-native-sdk').PaywallContext>>>;
type __p_PaywallContext = __Assert<__Same<__Params<PaywallContext>, __Params<import('@appdna-ai/react-native-sdk').PaywallContext>>>;
type __r_PaywallContext = __Assert<__Same<__Returns<PaywallContext>, __Returns<import('@appdna-ai/react-native-sdk').PaywallContext>>>;

export {};
