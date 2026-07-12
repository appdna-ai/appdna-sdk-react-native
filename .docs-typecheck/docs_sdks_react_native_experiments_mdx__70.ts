import { AppDNA } from '@appdna-ai/react-native-sdk';
const exposures = await AppDNA.experiments.getExposures();

for (const exposure of exposures) {
  const experimentId = exposure.experimentId as string | undefined;
  const variant = exposure.variant as string | undefined;
  console.log(`Exposed to ${experimentId} -> ${variant}`);
}

export {};
