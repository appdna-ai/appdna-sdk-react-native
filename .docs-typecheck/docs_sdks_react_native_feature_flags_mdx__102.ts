
import { AppDNA } from '@appdna-ai/react-native-sdk';

export class FeatureGate {
  async checkAccess(
    feature: string,
    options: { onLocked: () => void; onUnlocked: () => void },
  ): Promise<void> {
    if (await AppDNA.features.isEnabled(feature)) {
      options.onUnlocked();
    } else {
      options.onLocked();
    }
  }
}

// Usage
const gate = new FeatureGate();

await gate.checkAccess('ai_suggestions', {
  onLocked: () => {
    AppDNA.paywall.present('premium_paywall', { placement: 'feature_gate' });
  },
  onUnlocked: () => {
    showAISuggestions();
  },
});

// React to remote changes
AppDNA.features.onChanged(() => {
  // Re-evaluate gates when flags refresh.
});

export {};
