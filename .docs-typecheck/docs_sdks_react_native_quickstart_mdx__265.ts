import { AppDNA } from '@appdna-ai/react-native-sdk';
const version = await AppDNA.getSdkVersion();
console.log(`Native SDK version: ${version}`);

export {};
