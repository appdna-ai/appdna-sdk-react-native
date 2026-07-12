import { AppDNA } from '@appdna-ai/react-native-sdk';
const unsubscribe = AppDNA.remoteConfig.onChanged(async () => {
  const show = ((await AppDNA.remoteConfig.get('show_promo')) as boolean | undefined) ?? false;
  updatePromoBanner(show);
});

export {};
