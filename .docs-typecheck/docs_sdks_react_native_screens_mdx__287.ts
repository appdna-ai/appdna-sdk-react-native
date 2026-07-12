import { AppDNA } from '@appdna-ai/react-native-sdk';
const coordinator = new ScreenCoordinator();

export async function bootstrap(): Promise<void> {
  await AppDNA.configure('YOUR_API_KEY');
  await AppDNA.identify('user-123');
  coordinator.start();
}

export {};
