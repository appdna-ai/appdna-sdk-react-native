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
export declare class AppDNAPush {
    /** Request push notification permission. */
    static requestPermission(): Promise<boolean>;
    /** Listen for push received events. Returns unsubscribe function. */
    static onPushReceived(callback: (payload: PushPayload) => void): () => void;
    /** Listen for push tapped events. Returns unsubscribe function. */
    static onPushTapped(callback: (payload: PushPayload) => void): () => void;
}
//# sourceMappingURL=push.d.ts.map