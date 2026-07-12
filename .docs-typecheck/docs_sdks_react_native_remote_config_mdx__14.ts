
import { AppDNA } from '@appdna-ai/react-native-sdk';

const value = await AppDNA.remoteConfig.get('welcome_message');
const welcome = (value as string | undefined) ?? 'Hello!';

export {};
