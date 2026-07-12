import { AppDNA } from '@appdna-ai/react-native-sdk';
// Intercept every navigation
await AppDNA.screens.enableNavigationInterception();

// Or scope to specific routes (exact match or wildcard suffix)
await AppDNA.screens.enableNavigationInterception({
  forScreens: ['SettingsPage', 'Premium*'],
});

// To stop intercepting
await AppDNA.screens.disableNavigationInterception();

export {};
