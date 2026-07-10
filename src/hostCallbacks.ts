import { AppdnaModule, addNativeListener, parseNativeJson } from './nativeModule';

/**
 * SPEC-070-B §5 / §5.1 — the JS half of the host-veto wire protocol.
 *
 * Flutter's `invokeMethod` carries its own private reply port, so a veto correlates for free. React
 * Native's native→JS path is **one-way**: native emits `onHostCallback` with `{callbackId, hook,
 * argsJson}` and waits for an explicit `respondToHostCallback(callbackId, resultJson)`.
 *
 * ## Where the timeout is, and is not
 *
 * The 5s timer lives in **native** (`AppdnaHostCallbacks` on both platforms), never here. A JS
 * `setTimeout` is throttled when the app is backgrounded and destroyed outright by a Metro reload
 * (E5); native would then await forever, and onboarding would hang on a blank step. Native also owns
 * the per-hook default — seven allow, `onPromoCodeSubmit` rejects — so a hook that throws or is
 * unregistered replies with a JSON `null`, meaning "no opinion", and native applies that default.
 *
 * ## The eight hooks
 *
 * Four onboarding hooks return a **map**; the promo hook and the three vetoes return a bare
 * **boolean**. The single `resultJson` envelope preserves the distinction because it is JSON: `null`,
 * `true` and `{"action":"block"}` are all legal top-level values.
 */

/** The eight hooks native can ask about. Adding one here without a native emitter is inert, not a bug. */
export type HostCallbackHook =
  | 'onBeforeStepAdvance'
  | 'onBeforeStepRender'
  | 'onElementInteraction'
  | 'onPermissionRequest'
  | 'onPromoCodeSubmit'
  | 'shouldShowMessage'
  | 'shouldOpen'
  | 'onScreenAction';

/**
 * A hook receives the native argument map and returns the value to send back.
 *
 * `undefined` and `null` both encode as JSON `null` — "no opinion", native applies its default.
 */
export type HostCallbackHandler = (
  args: Record<string, unknown>,
) => unknown | Promise<unknown>;

type HostCallbackEvent = { callbackId: string; hook: string; argsJson: string };

const handlers = new Map<HostCallbackHook, HostCallbackHandler>();

let dispatcherInstalled = false;

/** `"null"` is the wire form of "no opinion". Never a stringified error — native must not parse prose. */
const NO_OPINION = 'null';

function encodeResult(value: unknown): string {
  if (value === undefined || value === null) return NO_OPINION;
  try {
    const json = JSON.stringify(value);
    // `JSON.stringify(() => {})` is `undefined`, not a throw. Treat it as no opinion rather than
    // sending the literal string "undefined", which native's JSON parser would reject.
    return json ?? NO_OPINION;
  } catch {
    return NO_OPINION;
  }
}

async function dispatch(event: HostCallbackEvent): Promise<void> {
  const handler = handlers.get(event.hook as HostCallbackHook);

  let resultJson = NO_OPINION;
  if (handler) {
    try {
      const args = parseNativeJson<Record<string, unknown>>(event.argsJson);
      resultJson = encodeResult(await handler(args));
    } catch (err) {
      // A host hook that throws must not hang the native surface. Native's default is the
      // conservative answer for each hook — reject for a promo code, allow for the rest.
      console.error(`[AppDNA] host callback '${event.hook}' threw; applying the native default.`, err);
      resultJson = NO_OPINION;
    }
  }

  // A reply for an id native already timed out and evicted is dropped there, not here.
  AppdnaModule.respondToHostCallback(event.callbackId, resultJson);
}

/** Installed once, on the first registered hook. Never removed — the module owns its own teardown. */
function ensureDispatcher(): void {
  if (dispatcherInstalled) return;
  dispatcherInstalled = true;
  addNativeListener<HostCallbackEvent>('onHostCallback', (event) => {
    void dispatch(event);
  });
}

/** Register (or replace) the handler for one hook. A later `setDelegate` overwrites the earlier one. */
export function registerHostCallback(hook: HostCallbackHook, handler: HostCallbackHandler): void {
  handlers.set(hook, handler);
  ensureDispatcher();
}

/** Drop a hook. Native then applies its per-hook default, exactly as if no host had ever registered. */
export function unregisterHostCallback(hook: HostCallbackHook): void {
  handlers.delete(hook);
}

/** Test seam: forget every hook and the dispatcher, so a suite starts from a known state. */
export function __resetHostCallbacksForTesting(): void {
  handlers.clear();
  dispatcherInstalled = false;
}
