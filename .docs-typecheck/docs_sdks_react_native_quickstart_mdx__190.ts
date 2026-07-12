import { AppDNA } from '@appdna-ai/react-native-sdk';
const exposures = await AppDNA.experiments.getExposures();
for (const exposure of exposures) {
  console.log(`${exposure.experimentId} → ${exposure.variant}`);
}

export {};
