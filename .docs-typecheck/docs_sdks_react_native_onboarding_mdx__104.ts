import type { AppDNAOnboardingDelegate } from '@appdna-ai/react-native-sdk';
const onboardingHandler: AppDNAOnboardingDelegate = {
  onOnboardingStarted(flowId) {
    console.log(`Onboarding started: ${flowId}`);
  },

  onOnboardingStepChanged(flowId, stepId, stepIndex, totalSteps) {
    console.log(`Step ${stepIndex + 1}/${totalSteps}: ${stepId}`);
    // Update progress indicator
  },

  onOnboardingCompleted(flowId, responses) {
    console.log(`Onboarding completed: ${flowId}`);
    console.log('User responses:', responses);
    // Navigate to main app screen
    // Use responses to personalize the experience
  },

  onOnboardingDismissed(flowId, atStep) {
    console.log(`Onboarding dismissed at step ${atStep}`);
    // Handle early exit — maybe show again later
  },
};

export {};
