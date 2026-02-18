export interface WebEntitlement {
  isActive: boolean;
  planName?: string;
  priceId?: string;
  interval?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodEnd?: number;
  trialEnd?: number;
}

export interface DeferredDeepLink {
  screen: string;
  params: Record<string, string>;
  visitorId: string;
}

export interface PaywallContext {
  placement?: string;
  customData?: Record<string, unknown>;
}

export type AppDNAEnvironment = 'production' | 'staging';
