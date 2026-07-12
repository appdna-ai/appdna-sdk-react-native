import { AppDNA } from '@appdna-ai/react-native-sdk';
import { Linking } from 'react-native';

// On initial launch:
const url = await Linking.getInitialURL();
if (url) {
  await AppDNA.deepLinks.handleURL(url);
}

// While the app is foreground:
Linking.addEventListener('url', ({ url }) => {
  AppDNA.deepLinks.handleURL(url);
});

export {};
