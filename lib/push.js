import { NativeModules, NativeEventEmitter } from 'react-native';
const { AppdnaModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(AppdnaModule);
/**
 * Push notification management for AppDNA React Native SDK.
 */
export class AppDNAPush {
    /** Request push notification permission. */
    static async requestPermission() {
        return AppdnaModule.requestPushPermission();
    }
    /** Listen for push received events. Returns unsubscribe function. */
    static onPushReceived(callback) {
        const subscription = eventEmitter.addListener('onPushReceived', callback);
        return () => subscription.remove();
    }
    /** Listen for push tapped events. Returns unsubscribe function. */
    static onPushTapped(callback) {
        const subscription = eventEmitter.addListener('onPushTapped', callback);
        return () => subscription.remove();
    }
}
//# sourceMappingURL=push.js.map