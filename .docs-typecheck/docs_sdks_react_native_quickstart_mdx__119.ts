import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.track('workout_completed', {
  duration: 45,
  type: 'strength',
});

export {};
