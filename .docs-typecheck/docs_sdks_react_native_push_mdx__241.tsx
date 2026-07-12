import React from 'react';
import { useEffect } from 'react';
import { AppDNA, AppDNAPush } from '@appdna-ai/react-native-sdk';

function App() {
  useEffect(() => {
    async function setupPush() {
      // Configure the SDK
      await AppDNA.configure('adn_live_xxx', 'production');

      // Set delegate for lifecycle callbacks
      AppDNA.push.setDelegate({
        onPushTokenRegistered(token) {
          console.log("Token:", token);
        },
        onPushReceived(notification, inForeground) {
          if (inForeground) {
            showInAppBanner(notification);
          }
        },
        onPushTapped(notification, actionId) {
          handleDeepLink(notification, actionId);
        },
      });

      // Request permission
      const granted = await AppDNA.push.requestPermission();
      console.log("Push permission:", granted);
    }

    setupPush();
  }, []);

  // Listener-based approach for component-scoped handling
  useEffect(() => {
    const unsubReceived = AppDNAPush.onPushReceived((payload) => {
      console.log("Received:", payload.title);
    });

    const unsubTapped = AppDNAPush.onPushTapped((payload) => {
      console.log("Tapped:", payload.pushId);
    });

    return () => {
      unsubReceived();
      unsubTapped();
    };
  }, []);

  return <MainNavigator />;
}

export {};
