
import { AppState, AppStateStatus } from 'react-native';
import { AppDNA } from '@appdna-ai/react-native-sdk';

// Flush events before background
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background') {
    AppDNA.flush();
  }
});

export {};
