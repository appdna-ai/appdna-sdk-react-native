import { AppDNA } from '@appdna-ai/react-native-sdk';
const isSubscribed = await AppDNA.billing.hasActiveSubscription();

export {};
