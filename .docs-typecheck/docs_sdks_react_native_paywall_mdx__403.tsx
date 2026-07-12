
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { AppDNA, AppDNAPaywallDelegate } from '@appdna-ai/react-native-sdk';

export function PremiumGate() {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const delegate: AppDNAPaywallDelegate = {
      onPaywallPresented: () => {},
      onPaywallAction: () => {},
      onPaywallPurchaseStarted: () => {},

      onPaywallPurchaseCompleted(paywallId, productId, transaction) {
        setIsPremium(true);
      },

      onPaywallPurchaseFailed(paywallId, error) {
        console.log('Purchase failed:', error.message);
      },

      onPaywallRestoreStarted: () => {},

      onPaywallRestoreCompleted(paywallId, restoredProductIds) {
        if (restoredProductIds.length > 0) {
          setIsPremium(true);
        }
      },

      onPaywallRestoreFailed: () => {},
      onPaywallDismissed: () => {},
    };

    AppDNA.paywall.setDelegate(delegate);

    (async () => {
      const active = await AppDNA.billing.hasActiveSubscription();
      setIsPremium(active);
    })();

    return () => {
      AppDNA.paywall.setDelegate(null);
    };
  }, []);

  async function showPaywall() {
    await AppDNA.paywall.present('premium_paywall', { placement: 'feature_gate' });
  }

  if (isPremium) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Premium content</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Unlock Premium" onPress={showPaywall} />
    </View>
  );
}

export {};
