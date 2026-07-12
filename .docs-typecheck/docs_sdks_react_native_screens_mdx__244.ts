
import { AppDNA, AppDNAScreenDelegate } from '@appdna-ai/react-native-sdk';

class ScreenCoordinator implements AppDNAScreenDelegate {
  start(): void {
    AppDNA.screens.setDelegate(this);
  }

  stop(): void {
    AppDNA.screens.setDelegate(null);
  }

  onScreenPresented(screenId: string): void {
    console.log(`Screen shown: ${screenId}`);
  }

  onScreenDismissed(screenId: string, result: Record<string, unknown>): void {
    const responses = result.responses as Record<string, unknown> | undefined;
    const purchased = responses?.purchased === true;
    if (purchased) {
      this._unlockPremium();
    }
  }

  onFlowCompleted(flowId: string, result: Record<string, unknown>): void {
    const screens = (result.screens_viewed as string[]) ?? [];
    console.log(`Flow ${flowId} completed, screens viewed:`, screens);
  }

  onScreenAction(screenId: string, action: Record<string, unknown>): boolean {
    const type = action.type as string | undefined;
    console.log(`Screen ${screenId} action: ${type}`);
    return true;
  }

  private _unlockPremium(): void {
    // Grant access in your own state management.
  }
}

export {};
