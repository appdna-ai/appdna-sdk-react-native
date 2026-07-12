
import { AppDNAPush } from '@appdna-ai/react-native-sdk';

// Request permission
const granted = await AppDNAPush.requestPermission();

// Listen for received push notifications
const unsubReceived = AppDNAPush.onPushReceived((payload) => {
  console.log("Push received:", payload.title);
});

// Listen for push notification taps
const unsubTapped = AppDNAPush.onPushTapped((payload) => {
  console.log("Push tapped:", payload.pushId);
  if (payload.actionValue) {
    navigateTo(payload.actionValue);
  }
});

// Clean up listeners when component unmounts
unsubReceived();
unsubTapped();

export {};
