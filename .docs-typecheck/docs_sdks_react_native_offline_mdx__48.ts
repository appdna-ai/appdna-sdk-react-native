import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.remoteConfig.onChanged(() => {
  // Config updated — re-read remote values and refresh UI
});

export {};
