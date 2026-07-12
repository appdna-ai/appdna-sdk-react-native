
import { AppDNA } from '@appdna-ai/react-native-sdk';

export class PaywallExperiment {
  async showPaywall(): Promise<void> {
    const variant = await AppDNA.experiments.getVariant('paywall_redesign');

    const paywallId = variant === 'new_design' ? 'paywall_v2' : 'paywall_v1';

    await AppDNA.paywall.present(paywallId, {
      placement: 'settings',
      customData: {
        experiment: 'paywall_redesign',
        variant: variant ?? 'control',
      },
    });
  }
}

export {};
