import { AppDNA } from '@appdna-ai/react-native-sdk';
await AppDNA.configure('adn_live_xxx', 'production', {
  flushInterval: 30, // Seconds between automatic flushes
  batchSize: 20,     // Events per batch
});

export {};
