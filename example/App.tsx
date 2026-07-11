import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppDNA, AppDNAScreenSlot, AppDNABilling } from '@appdna-ai/react-native-sdk';

/**
 * The SDK key arrives as an initial prop, put there by the native host from a LAUNCH ARGUMENT
 * (see AppDelegate.mm / MainActivity.kt). It is never committed, bundled, or written to disk:
 * this example is force-pushed to a public mirror, so a key stored here is a key published.
 *
 * Without a key the app still renders — it just says so. A demo that crashes on a missing secret
 * teaches nothing about the SDK.
 */
type Props = {
  apiKey?: string;
  /** Real content ids, injected as launch args — see AppDelegate.mm. Never committed. */
  onboardingId?: string;
  paywallId?: string;
  paywall2Id?: string;
  surveyId?: string;
  /** The event that triggers an in-app message in this app's console config. */
  messageEvent?: string;
};

export default function App({ apiKey, onboardingId, paywallId, paywall2Id, surveyId, messageEvent }: Props) {
  const [status, setStatus] = useState(apiKey ? 'Configuring…' : 'No API key — pass -appdnaApiKey');
  const [log, setLog] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState('');

  // The log is what the device pass reads back: every delegate callback and every veto appends a
  // line, so a hook that never fires is visible as an ABSENCE, not inferred from a passing await.
  const append = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), line]);
  }, []);
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    (async () => {
      // Delegates BEFORE configure: native starts emitting during configure, and a delegate
      // registered after it silently misses the opening events.
      AppDNA.onboarding.setDelegate({
        onOnboardingStarted: (flowId) => append(`onboarding started: ${flowId}`),
        onOnboardingStepChanged: (_f, stepId, i, total) =>
          append(`step ${i + 1}/${total}: ${stepId}`),
        onOnboardingCompleted: (flowId, responses) =>
          append(`onboarding completed: ${flowId} — ${Object.keys(responses).length} responses`),
        onOnboardingDismissed: (flowId, atStep) =>
          append(`onboarding dismissed: ${flowId} @ ${atStep}`),
        onPermissionResult: (_f, _s, type, granted) =>
          append(`permission ${type}: ${granted ? 'granted' : 'denied'}`),
        // A veto. Native BLOCKS the step until this resolves (or the timeout fires and the default
        // applies), which is the whole reason it cannot ride the event channel.
        onBeforeStepAdvance: async (_flowId, fromStepId) => {
          append(`veto onBeforeStepAdvance(${fromStepId}) → proceed`);
          return { type: 'proceed' };
        },
      });

      AppDNA.screens.setDelegate({
        onScreenPresented: (id) => append(`screen presented: ${id}`),
        onScreenDismissed: (id) => append(`screen dismissed: ${id}`),
        onFlowCompleted: (id) => append(`flow completed: ${id}`),
        onScreenAction: async (screenId, action) => {
          append(`veto onScreenAction(${screenId}, ${String(action.type)}) → allow`);
          return true;
        },
      });

      // ALL NINE delegates. Each callback appends a line, so a delegate that native never invokes is
      // visible as a missing line rather than inferred from a passing await. Three of these were
      // silently dead on Android until this pass: lifecycle, web-entitlement, and config-changed.
      AppDNA.paywall.setDelegate({
        onPaywallPresented: (id) => append(`paywall presented: ${id}`),
        onPaywallDismissed: (id) => append(`paywall dismissed: ${id}`),
        onPaywallAction: (id, action) => append(`paywall action: ${id} / ${action}`),
        onPaywallPurchaseCompleted: (id, productId) => append(`paywall purchase: ${id} / ${productId}`),
        onPaywallPurchaseFailed: (id, error) => append(`paywall purchase failed: ${id} / ${error}`),
        onPaywallRestoreCompleted: (products) => append(`paywall restore: ${products.length} product(s)`),
        onPaywallPurchaseStarted: (id, productId) => append(`paywall purchase started: ${id} / ${productId}`),
        onPaywallRestoreStarted: (id) => append(`paywall restore started: ${id}`),
        onPaywallRestoreFailed: (id, error) => append(`paywall restore failed: ${id} / ${String(error)}`),
        onPostPurchaseDeepLink: (url) => append(`post-purchase deep link: ${url}`),
        onPostPurchaseNextStep: (step) => append(`post-purchase next step: ${step}`),
      });

      AppDNA.surveys.setDelegate({
        onSurveyPresented: (id) => append(`survey presented: ${id}`),
        onSurveyCompleted: (id, responses) => append(`survey completed: ${id} — ${responses.length} response(s)`),
        onSurveyDismissed: (id) => append(`survey dismissed: ${id}`),
      });

      AppDNA.inAppMessages.setDelegate({
        onMessageShown: (id, trigger) => append(`message shown: ${id} (trigger=${trigger})`),
        onMessageAction: (id, action) => append(`message action: ${id} / ${action}`),
        onMessageDismissed: (id) => append(`message dismissed: ${id}`),
        // A VETO — native awaits this before showing. Allowing, and logging that we were asked.
        shouldShowMessage: (id) => { append(`veto shouldShowMessage(${id}) → allow`); return true; },
      });

      AppDNA.push.setDelegate({
        onPushTokenRegistered: (token) => append(`push token: ${token.slice(0, 12)}…`),
        onPushReceived: (_payload, inForeground) => append(`push received (foreground=${inForeground})`),
        onPushTapped: () => append('push tapped'),
      });

      AppDNA.deepLinks.setDelegate({
        onDeepLinkReceived: (url) => append(`deep link: ${url}`),
        shouldOpen: (url) => { append(`veto shouldOpen(${url}) → allow`); return true; },
      });

      AppDNA.lifecycle.setDelegate({
        onSdkRuntimeLocked: (reason) => append(`SDK LOCKED: ${reason}`),
        onSdkRuntimeUnlocked: () => append('SDK unlocked'),
      });

      AppDNABilling.setDelegate({
        onPurchaseCompleted: (productId) => append(`purchase completed: ${productId}`),
        onPurchaseFailed: (productId, error) => append(`purchase failed: ${productId} / ${error}`),
        onEntitlementsChanged: (ents) => append(`entitlements changed: ${ents.length}`),
        onRestoreCompleted: (products) => append(`restore completed: ${products.length}`),
      });

      AppDNA.onWebEntitlementChanged((e) => append(`web entitlement: ${e ? e.status : 'none'}`));
      AppDNA.remoteConfig.onChanged(() => append('remote config changed'));
      AppDNA.features.onChanged(() => append('feature flags changed'));

      await AppDNA.configure(apiKey);
      if (cancelled) return;
      setStatus('Configured');

      await AppDNA.onReady();
      if (cancelled) return;
      setStatus('Ready');

      await AppDNA.identify('rn_e2e_user', { plan: 'demo' });
      append('identified rn_e2e_user');

      // If init degraded, the SDK knows why — ask it rather than guessing from the outside.
      const initError = await AppDNA.getLastInitError();
      append(`getLastInitError → ${initError ? `${initError.type}: ${initError.message}` : 'none'}`);

      // The framework tag and the wrapper version are injected by native, never by this host —
      // diagnose() is where you see what it actually reported.
      setDiagnostics(await AppDNA.diagnose());
    })().catch((e) => setStatus(`Failed: ${String(e)}`));

    return () => {
      cancelled = true;
    };
  }, [apiKey, append]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AppDNA SDK Example</Text>

        <InfoCard title="SDK Status" value={status} />

        {/* An inline server-driven screen. It reserves its last-known height, so mounting it must
            not shift the layout below — that is the visible half of the W19 fix. */}
        <Text style={styles.sectionTitle}>Inline screen slot</Text>
        <AppDNAScreenSlot name="home_banner" style={styles.slot} />

        <View style={styles.buttons}>
          <Button label="Track event" onPress={() => { AppDNA.track('rn_e2e_button', { source: 'example' }); append('track(rn_e2e_button) queued'); }} />
          <Button label="Flush now" onPress={async () => { await AppDNA.flush(); append('flush() resolved'); }} />
          <Button
            label="Present onboarding"
            onPress={async () => append(`presentOnboarding → ${await AppDNA.onboarding.present(onboardingId ?? 'default')}`)}
          />
          <Button
            label="Present paywall"
            onPress={async () => { await AppDNA.paywall.present(paywallId ?? 'default'); append('presentPaywall dispatched'); }}
          />
          <Button
            label="Present paywall 2"
            onPress={async () => { await AppDNA.paywall.present(paywall2Id ?? 'default'); append('presentPaywall2 dispatched'); }}
          />
          <Button
            label="Show survey"
            onPress={async () => { await AppDNA.surveys.present(surveyId ?? 'default'); append('showSurvey dispatched'); }}
          />
          <Button
            label="Trigger in-app message"
            onPress={() => {
              // In-app messages are TRIGGERED by an event, not presented by id — the console binds a
              // message to an event name. Tracking it is the only way a host asks for one.
              AppDNA.track(messageEvent ?? 'rn_e2e_message_trigger');
              append(`track(${messageEvent ?? 'rn_e2e_message_trigger'}) — awaiting message`);
            }}
          />
          <Button
            label="Session round-trip"
            onPress={async () => {
              await AppDNA.session.set('rn_e2e', { n: 1, nested: { ok: true } });
              append(`session.get → ${JSON.stringify(await AppDNA.session.get('rn_e2e'))}`);
            }}
          />
          <Button label="Remote config" onPress={async () => append(`getRemoteConfig(welcome_message) → ${JSON.stringify(await AppDNA.getRemoteConfig('welcome_message'))}`)} />
          <Button label="Feature flag" onPress={async () => append(`isFeatureEnabled(dark_mode) → ${await AppDNA.isFeatureEnabled('dark_mode')}`)} />
          <Button label="Refresh diagnose()" onPress={async () => setDiagnostics(await AppDNA.diagnose())} />
        </View>

        <Text style={styles.sectionTitle}>diagnose()</Text>
        <Text style={styles.mono} testID="diagnostics">{diagnostics || '—'}</Text>

        <Text style={styles.sectionTitle}>Callback log</Text>
        <Text style={styles.mono} testID="callback-log">{log.length ? log.join('\n') : '—'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue} testID={`card-${title}`}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} testID={label}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 16, marginBottom: 6 },
  slot: { backgroundColor: '#fff', borderRadius: 12 },
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
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mono: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#1a1a1a',
  },
});
