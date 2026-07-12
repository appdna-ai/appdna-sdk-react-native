
import { AppDNA, AppDNAInAppMessageDelegate } from '@appdna-ai/react-native-sdk';

const messageHandler: AppDNAInAppMessageDelegate = {
  onMessageShown(messageId, trigger) {
    console.log(`Message shown: ${messageId} (trigger: ${trigger})`);
  },

  onMessageAction(messageId, action, data) {
    const url = data?.url as string | undefined;
    if (url) {
      // Handle deep link or URL action
      navigate(url);
    }
  },

  onMessageDismissed(messageId) {
    console.log(`Message dismissed: ${messageId}`);
  },

  shouldShowMessage(messageId) {
    // Return false to prevent the message from being shown.
    return true;
  },
};

function navigate(url: string): void { /* ... */ }

AppDNA.inAppMessages.setDelegate(messageHandler);

export {};
