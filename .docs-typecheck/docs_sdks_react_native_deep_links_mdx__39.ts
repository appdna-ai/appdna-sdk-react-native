import { AppDNA } from '@appdna-ai/react-native-sdk';
const deepLink = await AppDNA.checkDeferredDeepLink();
if (deepLink) {
  navigate(deepLink.screen, deepLink.params);
}

export {};
