
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Button, Alert } from 'react-native';
import { AppDNA, ProductInfo } from '@appdna-ai/react-native-sdk';

export function SubscriptionPage() {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    loadProducts();
    checkSubscription();

    const unsubscribe = AppDNA.billing.onEntitlementsChanged((entitlements) => {
      setIsSubscribed(entitlements.some((e) => e.status === 'active'));
    });

    return unsubscribe;
  }, []);

  async function loadProducts() {
    const result = await AppDNA.billing.getProducts(['premium_monthly', 'premium_yearly']);
    setProducts(result);
  }

  async function checkSubscription() {
    const active = await AppDNA.billing.hasActiveSubscription();
    setIsSubscribed(active);
  }

  async function purchase(product: ProductInfo) {
    try {
      await AppDNA.billing.purchase(product.id, product.offerToken);
      // Resolved means purchased; a cancellation or store error rejects.
      Alert.alert('Purchase successful!');
    } catch {
      // User cancelled, or the store failed. Nothing to unlock.
    }
  }

  async function restore() {
    const restored = await AppDNA.billing.restorePurchases();
    Alert.alert(`Restored ${restored.length} purchases`);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button title="Restore" onPress={restore} />
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => purchase(item)}
            style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            <Text>{item.description}</Text>
            <Text>{item.displayPrice}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export {};
