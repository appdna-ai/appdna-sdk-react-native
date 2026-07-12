import { AppDNA } from '@appdna-ai/react-native-sdk';
const token = await AppDNA.push.getToken();
if (token) {
  console.log("Current token:", token);
}

export {};
