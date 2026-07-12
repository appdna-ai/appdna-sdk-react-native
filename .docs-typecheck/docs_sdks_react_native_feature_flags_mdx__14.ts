
import { AppDNA } from '@appdna-ai/react-native-sdk';

if (await AppDNA.features.isEnabled('dark_mode')) {
  enableDarkMode();
}

export {};
