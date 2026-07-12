
import { AppDNA } from '@appdna-ai/react-native-sdk';

await AppDNA.configure('adn_live_xxx', 'production', {
  configTTL: 1800, // 30 minutes
});

export {};
