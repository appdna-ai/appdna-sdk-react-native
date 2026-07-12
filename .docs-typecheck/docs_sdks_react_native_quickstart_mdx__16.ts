
import { AppDNA } from '@appdna-ai/react-native-sdk';

async function bootstrap(): Promise<void> {
  await AppDNA.configure('adn_live_xxx', 'production', { logLevel: 'debug' });
}

bootstrap();

export {};
