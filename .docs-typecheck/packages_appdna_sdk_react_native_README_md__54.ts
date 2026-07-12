
import { AppDNA } from '@appdna-ai/react-native-sdk';

// Positional args: apiKey, environment, options. The environment is 'production' | 'sandbox'.
await AppDNA.configure('adn_live_xxx', 'production', { logLevel: 'warning' });

export {};
