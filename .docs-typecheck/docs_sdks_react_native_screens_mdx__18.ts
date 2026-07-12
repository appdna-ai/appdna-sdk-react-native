
import { AppDNA } from '@appdna-ai/react-native-sdk';

const result = await AppDNA.screens.show('upgrade_prompt');
if (result.dismissed) {
  console.log('User dismissed');
} else {
  console.log('Responses:', result.responses);
}

export {};
