import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.screens.preview({
  id: 'test',
  name: 'Test',
  presentation: 'modal',
  layout: { type: 'scroll' },
  sections: [/* ... */],
});

export {};
