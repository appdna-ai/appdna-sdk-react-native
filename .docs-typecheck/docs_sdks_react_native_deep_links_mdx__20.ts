
import { AppDNA } from '@appdna-ai/react-native-sdk';

const deepLink = await AppDNA.checkDeferredDeepLink();
if (deepLink) {
  // deepLink.screen = "/workout/123"
  // deepLink.params = { ref: "instagram" }
  navigate(deepLink.screen, deepLink.params);
}

export {};
