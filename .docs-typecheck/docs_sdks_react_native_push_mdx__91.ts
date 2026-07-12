import { AppDNA } from '@appdna-ai/react-native-sdk';
const granted = await AppDNA.push.requestPermission();

if (granted) {
  console.log("Push permission granted");
} else {
  console.log("Push permission denied");
}

export {};
