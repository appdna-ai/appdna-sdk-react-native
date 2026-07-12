import React from 'react';
interface AppDNAOnboardingDelegate {
  onOnboardingStarted(flowId: string): void;
  onOnboardingStepChanged(
    flowId: string,
    stepId: string,
    stepIndex: number,
    totalSteps: number,
  ): void;
  onOnboardingCompleted(flowId: string, responses: Record<string, unknown>): void;
  onOnboardingDismissed(flowId: string, atStep: number): void;

  // Async hooks — see "Async Step Hooks" below
  onBeforeStepAdvance?(
    flowId: string,
    fromStepId: string,
    stepIndex: number,
    stepType: string,
    responses: Record<string, unknown>,
    stepData: Record<string, unknown> | null,
  ): Promise<StepAdvanceResult>;

  onBeforeStepRender?(
    flowId: string,
    stepId: string,
    stepIndex: number,
    stepType: string,
    responses: Record<string, unknown>,
  ): Promise<StepConfigOverride | null>;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAOnboardingDelegate = __Assert<__Same<keyof AppDNAOnboardingDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAOnboardingDelegate>>;
type __o_AppDNAOnboardingDelegate = __Assert<__Same<__OptKeys<AppDNAOnboardingDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAOnboardingDelegate>>>;
type __p_AppDNAOnboardingDelegate = __Assert<__Same<__Params<AppDNAOnboardingDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAOnboardingDelegate>>>;
type __r_AppDNAOnboardingDelegate = __Assert<__Same<__Returns<AppDNAOnboardingDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAOnboardingDelegate>>>;

export {};
