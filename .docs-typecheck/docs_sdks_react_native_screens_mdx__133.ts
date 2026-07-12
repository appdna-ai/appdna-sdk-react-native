
import { AppDNA, AppDNAScreenDelegate } from '@appdna-ai/react-native-sdk';

const screenObserver: AppDNAScreenDelegate = {
  onScreenPresented(screenId) {
    console.log(`Screen shown: ${screenId}`);
  },

  onScreenDismissed(screenId, result) {
    const dismissed = (result.dismissed as boolean) ?? false;
    const responses = result.responses as Record<string, unknown> | undefined;
    const lastAction = result.last_action as string | undefined;
    console.log(`Screen ${screenId} dismissed=${dismissed}, action=${lastAction}`);
  },

  onFlowCompleted(flowId, result) {
    const completed = (result.completed as boolean) ?? false;
    const screensViewed = (result.screens_viewed as string[]) ?? [];
    console.log(`Flow ${flowId} completed=${completed}, screens=`, screensViewed);
  },

  onScreenAction(screenId, action) {
    const type = action.type as string | undefined;
    console.log(`Screen ${screenId} action: ${type}`);
    // Return false to intercept the action and apply custom handling.
    return true;
  },
};

AppDNA.screens.setDelegate(screenObserver);

export {};
