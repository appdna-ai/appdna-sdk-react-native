
import { AppDNA } from '@appdna-ai/react-native-sdk';

// Call a few seconds after configure() to allow bootstrap to complete
setTimeout(() => {
  AppDNA.diagnose();
}, 5000);

export {};
