/**
 * SPEC-070-B D-q2 / AC-14 — a runtime that cannot host the native module must fail comprehensibly.
 *
 * `AppdnaModule is undefined` is the error every published version of this package produced, and it
 * tells a host nothing about Expo Go, an unrun `pod install`, or RN Web. This suite asserts the
 * directed error, and — just as importantly — that merely IMPORTING the package on such a runtime
 * does not throw. A host that imports on web and never calls must not crash at module scope.
 */

// No AppdnaModule: this is exactly Expo Go / RN Web / a missing pod install.
//
// `NativeEventEmitter` here REPRODUCES RN's real iOS behaviour — it throws on a null argument. A
// permissive fake would let a module-scope `new NativeEventEmitter(undefined)` slip through, and the
// suite would pass while the real package threw `Invariant Violation` at import. That is precisely
// what this file exists to prevent.
jest.mock('react-native', () => ({
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation((nativeModule?: unknown) => {
    if (nativeModule == null) {
      throw new Error("Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.");
    }
    return {
      addListener: () => ({ remove: () => undefined }),
      removeAllListeners: () => undefined,
    };
  }),
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

describe('missing native module', () => {
  it('importing the package does not throw', () => {
    // Regression: index.ts, billing.ts and push.ts each built an emitter at module scope, so merely
    // importing on Expo Go raised RN's Invariant Violation before any AppDNA error could.
    expect(() => require('../src')).not.toThrow();
  });

  it('subscribing raises the directed error, not RN Invariant Violation', () => {
    const { AppDNA } = require('../src');
    // Any API that builds the shared emitter. Before the lazy `nativeEmitter()`, this path threw
    // RN's Invariant Violation from module scope — at import, not here.
    expect(() =>
      AppDNA.onboarding.setDelegate({
        onOnboardingStarted: () => undefined,
        onOnboardingStepChanged: () => undefined,
        onOnboardingCompleted: () => undefined,
        onOnboardingDismissed: () => undefined,
      }),
    ).toThrow(/native module is not available/i);
  });

  it('calling a method throws a directed error, not "AppdnaModule is undefined"', async () => {
    const { AppDNA } = require('../src');
    await expect(AppDNA.configure('adn_test_placeholder', 'sandbox')).rejects.toThrow(
      /native module is not available/i,
    );
  });

  it('the error names Expo Go, pod install, and the unsupported runtimes', async () => {
    const { AppDNA } = require('../src');
    const err = await AppDNA.configure('adn_test_placeholder', 'sandbox').catch((e: Error) => e);

    expect(err.message).toMatch(/Expo Go/);
    expect(err.message).toMatch(/pod install/);
    expect(err.message).toMatch(/RN Web and Yarn PnP/);
    // The bare, useless message must NOT be what a host sees.
    expect(err.message).not.toMatch(/^AppdnaModule is undefined/);
  });
});
