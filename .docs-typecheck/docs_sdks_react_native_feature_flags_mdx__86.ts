import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.features.onChanged(() => {
  // Reload any UI that depends on feature flags.
  reloadHomeScreen();
});

// Later, when you no longer need updates:
unsubscribe();

export {};
