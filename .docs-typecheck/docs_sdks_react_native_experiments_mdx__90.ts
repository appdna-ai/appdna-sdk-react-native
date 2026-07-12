import { AppDNA } from '@appdna-ai/react-native-sdk';
class HomeScreenController {
  private paywallVariant: string | null = null;

  async refresh(): Promise<void> {
    this.paywallVariant = await AppDNA.experiments.getVariant('paywall_redesign');
    // re-render UI that depends on this.paywallVariant
  }
}

export {};
