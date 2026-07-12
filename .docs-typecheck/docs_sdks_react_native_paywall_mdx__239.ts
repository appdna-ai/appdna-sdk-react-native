import { AppDNA } from '@appdna-ai/react-native-sdk';
const products = await AppDNA.billing.getProducts(['premium_monthly']);
// ... render your custom React Native components ...
try {
  const transaction = await AppDNA.billing.purchase('premium_monthly');
  // Resolved means purchased. Unlock premium features.
  console.log(transaction.transactionId);
} catch (error) {
  // Cancellation, a pending (ask-to-buy) purchase, and store errors all REJECT.
}

export {};
