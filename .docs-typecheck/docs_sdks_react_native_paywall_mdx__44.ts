import { AppDNA } from '@appdna-ai/react-native-sdk';
const placementToPaywall: Record<string, string> = {
  feature_gate: 'premium_paywall_a',
  settings:     'premium_paywall_b',
  onboarding:   'trial_paywall',
};

export async function showForPlacement(placement: string): Promise<void> {
  const id = placementToPaywall[placement] ?? 'premium_paywall_a';
  return AppDNA.paywall.present(id, { placement });
}

export {};
