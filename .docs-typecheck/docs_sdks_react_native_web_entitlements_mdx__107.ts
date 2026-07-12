
import { AppDNA, WebEntitlement } from '@appdna-ai/react-native-sdk';

export class PremiumManager {
  private unsubscribe: (() => void) | null = null;

  setup(): void {
    // Listen for web entitlement changes
    this.unsubscribe = AppDNA.onWebEntitlementChanged((entitlement) => {
      this.updateAccessState(entitlement);
    });
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async checkAccessOnLaunch(): Promise<void> {
    // Check in-app purchase entitlements
    const hasIAP = await AppDNA.billing.hasActiveSubscription();
    if (hasIAP) {
      this.unlockPremium();
      return;
    }

    // Check web entitlement
    const web = await AppDNA.getWebEntitlement();
    if (web && web.isActive) {
      this.unlockPremium();
      return;
    }

    // No active subscription from either source
    this.lockPremium();
  }

  private async updateAccessState(entitlement: WebEntitlement | null): Promise<void> {
    if (entitlement?.isActive === true) {
      this.unlockPremium();
    } else {
      // Re-check IAP entitlements before locking
      const hasIAP = await AppDNA.billing.hasActiveSubscription();
      if (!hasIAP) {
        this.lockPremium();
      }
    }
  }

  private unlockPremium(): void {
    // Enable premium features
  }

  private lockPremium(): void {
    // Disable premium features
  }
}

export {};
