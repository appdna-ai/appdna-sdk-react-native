import { AppDNA } from '@appdna-ai/react-native-sdk';
const variant = await AppDNA.features.getVariant('home_layout');

switch (variant) {
  case 'compact':
    showCompactHome();
    break;
  case 'detailed':
    showDetailedHome();
    break;
  default:
    showDefaultHome();
}

export {};
