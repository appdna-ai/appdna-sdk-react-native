/**
 * The three per-API listener helpers had ZERO test coverage: `push.onPushReceived`,
 * `push.onPushTapped`, `billing.onEntitlementsChanged`.
 *
 * That is not a gap in a corner. `onPushTapped` was re-pointed at `'onPushReceived'` — a documented
 * public API that fires when a push ARRIVES instead of when the user TAPS it, which silently converts
 * every tap-attributed conversion into an impression — and:
 *
 *   - `check:rn-facade-parity` printed ✅ (it UNIONED all facade files, so `onPushTapped` counted as
 *     "subscribed" because index.ts's delegate path also listens for it),
 *   - `check:rn-docs-api` printed ✅ (the method still exists and is still documented),
 *   - the full jest suite printed ✅ 40/40 (nothing called these helpers).
 *
 * Three green gates over a broken public API. So these tests assert the one thing none of them did:
 * that each helper subscribes to the event it is NAMED for. Swap the event name in the facade and
 * every test here goes red — that is the whole point, and it is verified by planting exactly that.
 */

const listenersByEvent = new Map<string, Array<(payload: unknown) => void>>();

/** Emitter properties are plain closures on the JSI host object; the mock mirrors that shape. */
function emitterFor(event: string) {
  return (listener: (payload: unknown) => void) => {
    const list = listenersByEvent.get(event) ?? [];
    list.push(listener);
    listenersByEvent.set(event, list);
    return {
      remove: () => {
        const current = listenersByEvent.get(event) ?? [];
        const at = current.indexOf(listener);
        if (at >= 0) current.splice(at, 1);
      },
    };
  };
}

// `onInitDegraded` is `requireNativeModule`'s SENTINEL: an emitter property proves the TurboModule
// runtime installed them, i.e. that we are on the New Architecture. Without it the SDK (correctly)
// refuses to subscribe at all.
const EVENTS = ['onInitDegraded', 'onPushReceived', 'onPushTapped', 'onEntitlementsChanged'];

const mockModule: Record<string, unknown> = {
  // `billing.onEntitlementsChanged` starts the native observer before subscribing.
  startEntitlementObserver: jest.fn().mockResolvedValue(undefined),
};
for (const event of EVENTS) mockModule[event] = emitterFor(event);

jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => mockModule, getEnforcing: () => mockModule },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

import { AppDNAPush } from '../src/push';
import { AppDNABilling } from '../src/billing';

/** Deliver a native event to whoever subscribed to it. Nobody subscribed ⇒ nobody is called. */
function emit(event: string, payload: unknown): void {
  for (const listener of listenersByEvent.get(event) ?? []) listener(payload);
}

beforeEach(() => listenersByEvent.clear());

describe('per-API listener wiring — each helper subscribes to the event it is named for', () => {
  it('push.onPushReceived fires on onPushReceived — and NOT on onPushTapped', () => {
    const calls: Array<{ pushId: string; inForeground: boolean }> = [];
    AppDNAPush.onPushReceived((payload, inForeground) => calls.push({ pushId: payload.push_id, inForeground }));

    // The wrong event must not reach it. If the helper were wired to 'onPushTapped', this fires.
    emit('onPushTapped', { payload: { push_id: 'p_tap' }, actionId: 'a1' });
    expect(calls).toHaveLength(0);

    emit('onPushReceived', { payload: { push_id: 'p_recv', title: 't', body: 'b' }, inForeground: true });
    expect(calls).toEqual([{ pushId: 'p_recv', inForeground: true }]);
  });

  it('push.onPushTapped fires on onPushTapped — and NOT on onPushReceived', () => {
    const calls: Array<{ pushId: string; actionId?: string }> = [];
    AppDNAPush.onPushTapped((payload, actionId) => calls.push({ pushId: payload.push_id, actionId }));

    // 🔴 The regression this test exists for: the helper subscribed to 'onPushReceived', so a push
    // that merely ARRIVED was reported to the host as a TAP.
    emit('onPushReceived', { payload: { push_id: 'p_recv' }, inForeground: false });
    expect(calls).toHaveLength(0);

    emit('onPushTapped', { payload: { push_id: 'p_tap', title: 't', body: 'b' }, actionId: 'open' });
    expect(calls).toEqual([{ pushId: 'p_tap', actionId: 'open' }]);
  });

  it('billing.onEntitlementsChanged fires on onEntitlementsChanged — and starts the native observer', () => {
    const calls: string[][] = [];
    AppDNABilling.onEntitlementsChanged((entitlements) => calls.push(entitlements.map((e) => e.productId)));

    // Without this, the SDK subscribes to an observer native never started and the callback is silent.
    expect(mockModule.startEntitlementObserver).toHaveBeenCalled();

    emit('onPushReceived', { payload: { push_id: 'x' }, inForeground: true });
    expect(calls).toHaveLength(0);

    emit('onEntitlementsChanged', {
      entitlements: [{ productId: 'pro_monthly', isActive: true }],
    });
    expect(calls).toEqual([['pro_monthly']]);
  });

  it('the unsubscribe function actually unsubscribes', () => {
    const seen: string[] = [];
    const off = AppDNAPush.onPushTapped((payload) => seen.push(payload.push_id));

    emit('onPushTapped', { payload: { push_id: 'first' } });
    off();
    emit('onPushTapped', { payload: { push_id: 'second' } });

    expect(seen).toEqual(['first']); // 'second' arrived after unsubscribe — it must not be delivered
  });
});
