
import { AppDNA } from '@appdna-ai/react-native-sdk';

try {
  await AppDNA.presentOnboarding('main_flow');
} catch (e) {
  console.log('Flow config not available — check Console or network:', e);
}

export {};
