import { AppDNA } from '@appdna-ai/react-native-sdk';
const result = await AppDNA.screens.showFlow('onboarding_v2');
if (result.completed) {
  console.log(`Completed: ${result.screensViewed.length} screens — ${result.screensViewed.join(' → ')}`);
} else {
  console.log(`Abandoned at screen ${result.lastScreenId}`);
}

export {};
