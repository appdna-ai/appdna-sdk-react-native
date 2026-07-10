import { NativeModules, NativeEventEmitter } from 'react-native';

/**
 * SPEC-070-B D-q2 / §20 — the single place the native module is resolved.
 *
 * ## Why lazily
 *
 * `index.ts`, `billing.ts` and `push.ts` each used to run `new NativeEventEmitter(AppdnaModule)` at
 * MODULE SCOPE. On a runtime without the native module — Expo Go, RN Web, or an app whose
 * `pod install` never ran — `AppdnaModule` is `undefined` and RN answers with
 * `Invariant Violation: 'new NativeEventEmitter()' requires a non-null argument`, thrown at import,
 * before any host code runs and before any error of ours could be raised.
 *
 * So the emitter is built on first use, not on import. A host that imports this package on a
 * platform where it never calls it gets silence, which is the correct behavior.
 */

/** The bare, useless error five published versions of this package produced. */
const DIRECTED_ERROR =
  '[AppDNA] The native module is not available.\n' +
  '  • Expo Go cannot host it — use a development build (npx expo prebuild && npx expo run:ios).\n' +
  '  • Bare RN: run `pod install` (iOS) / rebuild the app (Android) after installing the package.\n' +
  '  • RN Web and Yarn PnP are not supported.\n' +
  '  See https://docs.appdna.ai/sdks/react-native/installation';

/** Whether the native module is present. Never throws — callers decide what absence means. */
export function hasNativeModule(): boolean {
  return Boolean(NativeModules.AppdnaModule);
}

/** The native module, or a directed error explaining exactly which runtime you are on. */
export function requireNativeModule(): typeof NativeModules.AppdnaModule {
  const mod = NativeModules.AppdnaModule;
  if (!mod) throw new Error(DIRECTED_ERROR);
  return mod;
}

/**
 * A stand-in that raises the directed error on the first METHOD CALL rather than at import.
 * Property reads are what the facade does; each resolves through `requireNativeModule`.
 */
export const AppdnaModule: typeof NativeModules.AppdnaModule = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return requireNativeModule()[prop];
    },
  },
);

let cachedEmitter: NativeEventEmitter | undefined;

/**
 * The shared event emitter, constructed on first use.
 * Throws the directed error — not RN's `Invariant Violation` — when the module is absent.
 */
export function nativeEmitter(): NativeEventEmitter {
  if (cachedEmitter) return cachedEmitter;
  cachedEmitter = new NativeEventEmitter(requireNativeModule());
  return cachedEmitter;
}

/** Test seam: drop the memoised emitter so a suite can re-resolve against a fresh mock. */
export function __resetNativeEmitterForTesting(): void {
  cachedEmitter = undefined;
}
