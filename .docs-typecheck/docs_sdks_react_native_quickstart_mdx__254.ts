import { AppDNA } from '@appdna-ai/react-native-sdk';
const link = await AppDNA.checkDeferredDeepLink();
if (link) {
  // Navigate to the linked content
}

export {};
