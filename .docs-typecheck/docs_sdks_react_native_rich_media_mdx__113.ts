import { AppDNA } from '@appdna-ai/react-native-sdk';
try {
  await AppDNA.onboarding.present('main_flow');
} catch (e) {
  console.log('Flow config not available:', e);
}

export {};
