import { AppDNA } from '@appdna-ai/react-native-sdk';
const retries = ((await AppDNA.remoteConfig.get('max_retries')) as number | undefined) ?? 3;
const discount = ((await AppDNA.remoteConfig.get('discount_rate')) as number | undefined) ?? 0.1;
const promoOn = ((await AppDNA.remoteConfig.get('show_promo')) as boolean | undefined) ?? false;

// JSON values arrive as plain JS objects across the bridge.
const raw = await AppDNA.remoteConfig.get('hero_banner');
const banner = typeof raw === 'object' && raw !== null
  ? (raw as Record<string, unknown>)
  : null;

export {};
