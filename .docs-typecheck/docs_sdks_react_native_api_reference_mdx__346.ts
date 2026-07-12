
interface AppDNAScreenDelegate {
  onScreenPresented(screenId: string): void;
  onScreenDismissed(screenId: string, result: Record<string, unknown>): void;
  onFlowCompleted(flowId: string, result: Record<string, unknown>): void;
  onScreenAction(screenId: string, action: Record<string, unknown>): boolean;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAScreenDelegate = __Assert<__Same<keyof AppDNAScreenDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAScreenDelegate>>;
type __o_AppDNAScreenDelegate = __Assert<__Same<__OptKeys<AppDNAScreenDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAScreenDelegate>>>;
type __p_AppDNAScreenDelegate = __Assert<__Same<__Params<AppDNAScreenDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAScreenDelegate>>>;
type __r_AppDNAScreenDelegate = __Assert<__Same<__Returns<AppDNAScreenDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAScreenDelegate>>>;

export {};
