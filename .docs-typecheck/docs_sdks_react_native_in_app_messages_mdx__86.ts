
interface AppDNAInAppMessageDelegate {
  onMessageShown(messageId: string, trigger: string): void;

  onMessageAction(
    messageId: string,
    action: string,
    data: Record<string, unknown> | null,
  ): void;

  onMessageDismissed(messageId: string): void;

  /** Veto. Return false to suppress display. */
  shouldShowMessage?(messageId: string): boolean;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAInAppMessageDelegate = __Assert<__Same<keyof AppDNAInAppMessageDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAInAppMessageDelegate>>;
type __o_AppDNAInAppMessageDelegate = __Assert<__Same<__OptKeys<AppDNAInAppMessageDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAInAppMessageDelegate>>>;
type __p_AppDNAInAppMessageDelegate = __Assert<__Same<__Params<AppDNAInAppMessageDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAInAppMessageDelegate>>>;
type __r_AppDNAInAppMessageDelegate = __Assert<__Same<__Returns<AppDNAInAppMessageDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAInAppMessageDelegate>>>;

export {};
