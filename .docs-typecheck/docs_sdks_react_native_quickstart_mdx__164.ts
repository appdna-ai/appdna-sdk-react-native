import { AppDNA } from '@appdna-ai/react-native-sdk';
const welcomeMessage = await AppDNA.getRemoteConfig('welcome_message');

export {};
