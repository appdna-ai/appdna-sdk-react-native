import { AppDNA } from '@appdna-ai/react-native-sdk';
const all = await AppDNA.remoteConfig.getAll();
console.log(`Loaded ${Object.keys(all).length} config keys`);

export {};
