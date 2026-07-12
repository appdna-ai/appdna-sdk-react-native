import { AppDNA } from '@appdna-ai/react-native-sdk';
try {
  const transaction = await AppDNA.billing.purchase('premium_monthly', 'offer-xxx');
  // Resolved means PURCHASED. There is no status to check.
  console.log(`Purchased ${transaction.productId} (${transaction.transactionId})`);
} catch (error) {
  // A user cancellation, a pending (deferred / ask-to-buy) purchase, and a store failure
  // all REJECT — natively they throw, and the wrapper surfaces them as `PURCHASE_ERROR`.
  console.log('Purchase did not complete:', error);
}

export {};
