
import { AppDNA, AppDNADeepLinkDelegate } from '@appdna-ai/react-native-sdk';

const linkHandler: AppDNADeepLinkDelegate = {
  shouldOpen(url, params) {
    // Return false to defer routing (e.g., until login completes).
    return true;
  },

  onDeepLinkReceived(url, params) {
    // Route based on the incoming URL
    const parsed = new URL(url);
    route(parsed.pathname, params);
  },
};

function route(screen: string, params: Record<string, unknown>): void {
  if (screen.startsWith('/workout/')) {
    const id = screen.substring('/workout/'.length);
    showWorkout(id);
  } else if (screen === '/referral') {
    showReferralWelcome(params.ref as string | undefined);
  } else {
    showHome();
  }
}

function showWorkout(id: string): void { /* ... */ }
function showReferralWelcome(referrer: string | undefined): void { /* ... */ }
function showHome(): void { /* ... */ }

AppDNA.deepLinks.setDelegate(linkHandler);

export {};
