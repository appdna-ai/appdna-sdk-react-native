
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppDNA, AppDNAOnboardingDelegate } from '@appdna-ai/react-native-sdk';

export function OnboardingScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const delegate: AppDNAOnboardingDelegate = {
      onOnboardingStarted(flowId) {
        console.log(`Starting flow: ${flowId}`);
      },

      onOnboardingStepChanged(flowId, stepId, stepIndex, totalSteps) {
        // Track progress
      },

      onOnboardingCompleted(flowId, responses) {
        // Personalize based on responses
        const goal = responses['fitness_goal'] as string | undefined;
        if (goal) {
          AppDNA.identify('current_user_id', { fitness_goal: goal });
        }
        navigation.replace('Home');
      },

      onOnboardingDismissed(flowId, atStep) {
        navigation.replace('Home');
      },
    };

    AppDNA.onboarding.setDelegate(delegate);
    showOnboardingIfNeeded();

    return () => {
      AppDNA.onboarding.setDelegate(null);
    };
  }, [navigation]);

  async function showOnboardingIfNeeded() {
    try {
      await AppDNA.onboarding.present('main_flow', { source: 'app_launch' });
    } catch (e) {
      // No active flow or config not loaded yet
      navigation.replace('Home');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

export {};
