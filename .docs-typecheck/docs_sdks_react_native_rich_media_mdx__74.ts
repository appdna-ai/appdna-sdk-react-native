
import { AppDNA } from '@appdna-ai/react-native-sdk';

try {
  await AppDNA.paywall.present('premium_upgrade', { placement: 'settings' });
} catch (e) {
  console.log('Paywall not available:', e);
}

export {};
