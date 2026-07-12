
interface AppDNAPaywallDelegate {
  onPaywallPresented(paywallId: string): void;
  onPaywallAction(paywallId: string, action: string): void;
  onPaywallPurchaseStarted(paywallId: string, productId: string): void;
  onPaywallPurchaseCompleted(
    paywallId: string,
    productId: string,
    transaction: Record<string, unknown>,
  ): void;
  onPaywallPurchaseFailed(paywallId: string, error: Error): void;
  onPaywallRestoreStarted(paywallId: string): void;
  onPaywallRestoreCompleted(paywallId: string, restoredProductIds: string[]): void;
  onPaywallRestoreFailed(paywallId: string, error: Error): void;
  onPaywallDismissed(paywallId: string): void;

  /** Called when the user submits a promo code. Return `true` to apply it. */
  onPromoCodeSubmit?(paywallId: string, code: string): Promise<boolean>;

  /**
   * Called after a successful purchase when the paywall section carries a
   * `post_purchase_deep_link` URL configured in the Console.
   */
  onPostPurchaseDeepLink?(paywallId: string, url: string): void;

  /**
   * Called after a successful purchase when the paywall section carries a
   * `post_purchase_next_step` configured in the Console (e.g., navigate to
   * the success screen, continue an onboarding flow).
   */
  onPostPurchaseNextStep?(paywallId: string): void;
}

// ── conformance: this declaration must equal the shipped type, member for member ──
type __Params<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? Parameters<T[K]> : T[K] };
type __Returns<T> = { [K in keyof T]-?: T[K] extends (...a: never[]) => unknown ? ReturnType<T[K]> : never };
type __OptKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type __Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type __Assert<T extends true> = T;
type __k_AppDNAPaywallDelegate = __Assert<__Same<keyof AppDNAPaywallDelegate, keyof import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>;
type __o_AppDNAPaywallDelegate = __Assert<__Same<__OptKeys<AppDNAPaywallDelegate>, __OptKeys<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;
type __p_AppDNAPaywallDelegate = __Assert<__Same<__Params<AppDNAPaywallDelegate>, __Params<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;
type __r_AppDNAPaywallDelegate = __Assert<__Same<__Returns<AppDNAPaywallDelegate>, __Returns<import('@appdna-ai/react-native-sdk').AppDNAPaywallDelegate>>>;

export {};
