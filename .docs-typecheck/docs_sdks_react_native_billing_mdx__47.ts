import { AppDNA } from '@appdna-ai/react-native-sdk';
const products = await AppDNA.billing.getProducts(['premium_monthly']);

for (const product of products) {
  console.log(`${product.name}: ${product.displayPrice}`);
}

export {};
