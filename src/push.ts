import { NativeModules, NativeEventEmitter } from 'react-native';

const { AppdnaModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(AppdnaModule);

export interface PushPayload {
  push_id: string;
  title: string;
  body: string;
  image_url?: string;
  data?: Record<string, string>;
  action_type?: string;
  action_value?: string;
}

/**
 * Push notification management for AppDNA React Native SDK.
 */
export class AppDNAPush {
  /** Request push notification permission. */
  static async requestPermission(): Promise<boolean> {
    return AppdnaModule.requestPushPermission();
  }

  /** Listen for push received events. Returns unsubscribe function. */
  static onPushReceived(callback: (payload: PushPayload) => void): () => void {
    const subscription = eventEmitter.addListener('onPushReceived', callback);
    return () => subscription.remove();
  }

  /** Listen for push tapped events. Returns unsubscribe function. */
  static onPushTapped(callback: (payload: PushPayload) => void): () => void {
    const subscription = eventEmitter.addListener('onPushTapped', callback);
    return () => subscription.remove();
  }
}
