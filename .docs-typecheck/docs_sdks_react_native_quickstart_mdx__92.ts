import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.onReady(() => {
  console.log('SDK ready -- remote config loaded');
});

export {};
