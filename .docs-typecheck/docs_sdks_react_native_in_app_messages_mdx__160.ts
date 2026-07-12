
import { AppDNA, AppDNAInAppMessageDelegate } from '@appdna-ai/react-native-sdk';

class AppCoordinator implements AppDNAInAppMessageDelegate {
  constructor() {
    AppDNA.inAppMessages.setDelegate(this);
  }

  async startOnboarding(): Promise<void> {
    // Suppress messages during onboarding
    await AppDNA.inAppMessages.suppressDisplay(true);
    this.presentOnboardingFlow();
  }

  async onboardingDidFinish(): Promise<void> {
    // Resume messages after onboarding
    await AppDNA.inAppMessages.suppressDisplay(false);
  }

  // AppDNAInAppMessageDelegate

  onMessageShown(messageId: string, trigger: string): void {
    // Optionally track in your own analytics
  }

  onMessageAction(
    messageId: string,
    action: string,
    data: Record<string, unknown> | null,
  ): void {
    const url = data?.url as string | undefined;
    if (url) {
      this.navigate(url);
    } else if (action === 'dismiss') {
      // no-op
    }
  }

  onMessageDismissed(messageId: string): void {
    // Message closed
  }

  shouldShowMessage(messageId: string): boolean {
    return true;
  }

  private navigate(url: string): void { /* ... */ }
  private presentOnboardingFlow(): void { /* ... */ }
}

export {};
