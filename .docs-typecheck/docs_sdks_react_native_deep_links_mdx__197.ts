
import { AppDNA, AppDNADeepLinkDelegate } from '@appdna-ai/react-native-sdk';

class AppCoordinator implements AppDNADeepLinkDelegate {
  constructor() {
    AppDNA.deepLinks.setDelegate(this);
  }

  async handleFirstLaunch(currentUserId: string): Promise<void> {
    // Check for deferred deep link on first launch
    const deepLink = await AppDNA.checkDeferredDeepLink();

    if (deepLink) {
      // User installed from a link -- route to the target screen
      this.route(deepLink.screen, deepLink.params);

      // Track the visitor as a user trait
      await AppDNA.identify(currentUserId, {
        visitor_id: deepLink.visitorId,
      });
    } else {
      // Normal install -- show default onboarding
      this.showOnboarding();
    }
  }

  // AppDNADeepLinkDelegate

  shouldOpen(url: string, params: Record<string, unknown>): boolean {
    return true;
  }

  onDeepLinkReceived(url: string, params: Record<string, unknown>): void {
    const parsed = new URL(url);
    this.route(parsed.pathname, params);
  }

  private route(screen: string, params: Record<string, unknown>): void {
    // Route to the correct screen based on the path
  }

  private showOnboarding(): void { /* ... */ }
}

export {};
