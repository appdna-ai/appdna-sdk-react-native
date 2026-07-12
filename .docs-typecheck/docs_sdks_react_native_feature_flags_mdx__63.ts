import { AppDNA } from '@appdna-ai/react-native-sdk';
if (await AppDNA.features.isEnabled('new_workout_ui')) {
  const variant = await AppDNA.experiments.getVariant('workout_ui_test');

  switch (variant) {
    case 'compact':
      showCompactWorkoutUI();
      break;
    case 'detailed':
      showDetailedWorkoutUI();
      break;
    default:
      showDefaultWorkoutUI();
  }
} else {
  showLegacyWorkoutUI();
}

export {};
