import { AppDNA } from '@appdna-ai/react-native-sdk';
// Store session data
await AppDNA.session.set({ key: 'selected_plan', value: 'premium' });
await AppDNA.session.set({ key: 'referral_code', value: 'FRIEND2026' });

// Retrieve session data
const plan = await AppDNA.session.get({ key: 'selected_plan' }); // "premium"

// Clear all session data
await AppDNA.session.clear();

export {};
