
interface AppDNASurveyDelegate {
  onSurveyPresented(surveyId: string): void;
  onSurveyCompleted(surveyId: string, responses: Record<string, unknown>): void;
  onSurveyDismissed(surveyId: string): void;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNASurveyDelegate = __Assert<__Same<keyof AppDNASurveyDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNASurveyDelegate>>;
type __o_AppDNASurveyDelegate = __Assert<__Same<__OptKeys<AppDNASurveyDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNASurveyDelegate>>>;
type __p_AppDNASurveyDelegate = __Assert<__Same<__Params<AppDNASurveyDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNASurveyDelegate>>>;
type __r_AppDNASurveyDelegate = __Assert<__Same<__Returns<AppDNASurveyDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNASurveyDelegate>>>;

export {};
