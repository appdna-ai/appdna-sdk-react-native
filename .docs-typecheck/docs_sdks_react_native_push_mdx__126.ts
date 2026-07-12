import { AppDNA } from '@appdna-ai/react-native-sdk';
AppDNA.push.setDelegate({
  onPushTokenRegistered(token: string) {
    console.log("Token registered:", token);
  },

  onPushReceived(notification: Record<string, unknown>, inForeground: boolean) {
    if (inForeground) {
      // Show in-app notification banner
      showBanner(notification.title, notification.body);
    }
  },

  onPushTapped(notification: Record<string, unknown>, actionId: string | null) {
    if (actionId) {
      // Handle custom action
      handleAction(actionId);
    }
  },
});

export {};
