import { AppdnaModule, addNativeListener } from './nativeModule';

export interface PushPayload {
  push_id: string;
  title: string;
  body: string;
  image_url?: string;
  data?: Record<string, string>;
  action_type?: string;
  action_value?: string;
}

/** The native event payloads. Native wraps the notification, because an event payload is an object. */
type PushReceivedPayload = { payload: PushPayload; inForeground: boolean };
type PushTappedPayload = { payload: PushPayload; actionId?: string };

/**
 * Push notification management for AppDNA React Native SDK.
 */
export class AppDNAPush {
  /** Request push notification permission. */
  static async requestPermission(): Promise<boolean> {
    return AppdnaModule.requestPushPermission();
  }

  /** Listen for push received events. Returns unsubscribe function. */
  static onPushReceived(callback: (payload: PushPayload, inForeground: boolean) => void): () => void {
    const subscription = addNativeListener<PushReceivedPayload>('onPushReceived', (data) =>
      callback(data.payload, data.inForeground),
    );
    return () => subscription.remove();
  }

  /** Listen for push tapped events. Returns unsubscribe function. */
  static onPushTapped(callback: (payload: PushPayload, actionId?: string) => void): () => void {
    const subscription = addNativeListener<PushTappedPayload>('onPushReceived', (data) =>
      callback(data.payload, data.actionId),
    );
    return () => subscription.remove();
  }
}
