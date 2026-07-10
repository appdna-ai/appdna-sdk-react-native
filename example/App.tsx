import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { AppDNA } from '@appdna-ai/react-native-sdk';
import type { WebEntitlement, DeferredDeepLink } from '@appdna-ai/react-native-sdk';

export default function App() {
  const [status, setStatus] = useState('Not configured');
  const [webEntitlement, setWebEntitlement] = useState<WebEntitlement | null>(null);
  const [deepLink, setDeepLink] = useState<DeferredDeepLink | null>(null);

  useEffect(() => {
    initSdk();
  }, []);

  async function initSdk() {
    // 1. Configure SDK
    await AppDNA.configure('YOUR_API_KEY');
    setStatus('Configured');

    // 2. Wait for SDK to be fully ready (config fetched, etc.)
    await AppDNA.onReady();
    setStatus('Ready');

    // 3. Identify user
    await AppDNA.identify('user_123', { email: 'demo@example.com' });
    setStatus('Identified');

    // 4. Check for deferred deep link (first launch)
    const link = await AppDNA.checkDeferredDeepLink();
    if (link) {
      setDeepLink(link);
    }

    // 5. Listen for web entitlement changes
    const unsubscribe = AppDNA.onWebEntitlementChanged((entitlement) => {
      setWebEntitlement(entitlement);
    });

    return () => unsubscribe();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AppDNA SDK Example</Text>

        <InfoCard title="SDK Status" value={status} />
        <InfoCard
          title="Web Entitlement"
          value={
            webEntitlement
              ? `${webEntitlement.planName} (${webEntitlement.status})`
              : 'Not loaded'
          }
        />
        <InfoCard
          title="Deferred Deep Link"
          value={deepLink ? `${deepLink.screen} (${JSON.stringify(deepLink.params)})` : 'None'}
        />

        <View style={styles.buttons}>
          <Button
            label="Track Event"
            onPress={() => AppDNA.track('button_tapped', { button: 'demo' })}
          />
          <Button
            label="Present Paywall"
            onPress={() => AppDNA.presentPaywall('default')}
          />
          <Button
            label="Present Onboarding"
            onPress={() => AppDNA.presentOnboarding('default')}
          />
          <Button
            label="Get Remote Config"
            onPress={async () => {
              const value = await AppDNA.getRemoteConfig('welcome_message');
              Alert.alert('Remote Config', `Value: ${value}`);
            }}
          />
          <Button
            label="Get Experiment Variant"
            onPress={async () => {
              const variant = await AppDNA.getExperimentVariant('onboarding_test');
              Alert.alert('Experiment', `Variant: ${variant}`);
            }}
          />
          <Button
            label="Check Feature Flag"
            onPress={async () => {
              const enabled = await AppDNA.isFeatureEnabled('dark_mode');
              Alert.alert('Feature Flag', `Enabled: ${enabled}`);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 16, color: '#1a1a1a' },
  buttons: { marginTop: 12 },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
