
import { AppDNA } from '@appdna-ai/react-native-sdk';

async function bootstrap(): Promise<void> {
  const version = await AppDNA.getSdkVersion();
  console.log(version); // native version, e.g. iOS "1.0.70" or Android "1.0.42"
}

export {};
