import { AppDNA } from '@appdna-ai/react-native-sdk';
const ents = await AppDNA.billing.getEntitlements();

for (const ent of ents) {
  console.log(`${ent.productId}: ${ent.status}, trial: ${ent.isTrial}`);
}

export {};
