
import { AppDNA, AppDNAInAppMessageDelegate } from '@appdna-ai/react-native-sdk';

const messageObserver: AppDNAInAppMessageDelegate = {
  onMessageShown(messageId, trigger) {
    console.log(`Message shown: ${messageId}`);
  },

  onMessageAction(messageId, action, data) {
    console.log(`Message action: ${action}`);
  },

  onMessageDismissed(messageId) {
    console.log(`Message dismissed: ${messageId}`);
  },

  shouldShowMessage(messageId) {
    // Return false to suppress display.
    return true;
  },
};

AppDNA.inAppMessages.setDelegate(messageObserver);

export {};
