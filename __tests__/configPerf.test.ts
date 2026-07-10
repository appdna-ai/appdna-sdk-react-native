/**
 * SPEC-070-B P9 — W16 (synchronous config snapshot) + W17 (fire-and-forget track).
 *
 * Both are perf contracts a typecheck cannot express: that `track()` returns no Promise, and that a
 * primed config snapshot answers synchronously and refreshes when native reports a change.
 */

let remoteConfigListener: (() => void) | undefined;

const mockModule = {
  track: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  getAllRemoteConfig: jest.fn().mockResolvedValue(JSON.stringify({ flagA: true, count: 42 })),
  onRemoteConfigChanged: (listener: () => void) => {
    remoteConfigListener = listener;
    return { remove: () => (remoteConfigListener = undefined) };
  },
  // Sentinels/emitters the facade may touch at import or setup.
  onInitDegraded: () => ({ remove: () => undefined }),
  onHostCallback: () => ({ remove: () => undefined }),
};

jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => mockModule, getEnforcing: () => mockModule },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

import { AppDNA } from '../src/index';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  mockModule.getAllRemoteConfig.mockResolvedValue(JSON.stringify({ flagA: true, count: 42 }));
  await AppDNA.shutdown(); // reset the module-level snapshot between tests
});

describe('W17 — track() is fire-and-forget', () => {
  it('returns void, not a Promise, and still crosses to native', () => {
    const result = AppDNA.track('scrolled', { y: 10 });
    expect(result).toBeUndefined();
    expect(mockModule.track).toHaveBeenCalledWith('scrolled', { y: 10 });
  });

  it('a native rejection does not surface as an unhandled rejection', async () => {
    mockModule.track.mockRejectedValueOnce(new Error('bridge torn down'));
    expect(() => AppDNA.track('e')).not.toThrow();
    await flush(); // let the swallowed rejection settle
  });
});

describe('W16 — synchronous config snapshot', () => {
  it('getCached is undefined until primed', () => {
    expect(AppDNA.remoteConfig.hasSnapshot()).toBe(false);
    expect(AppDNA.remoteConfig.getCached('flagA')).toBeUndefined();
  });

  it('after primeSnapshot, reads are synchronous and correct', async () => {
    await AppDNA.remoteConfig.primeSnapshot();
    expect(AppDNA.remoteConfig.hasSnapshot()).toBe(true);
    expect(AppDNA.remoteConfig.getCached('flagA')).toBe(true);
    expect(AppDNA.remoteConfig.getCached('count')).toBe(42);
    expect(AppDNA.remoteConfig.getCached('absent')).toBeUndefined();
  });

  it('auto-refreshes when native fires onRemoteConfigChanged', async () => {
    await AppDNA.remoteConfig.primeSnapshot();
    expect(AppDNA.remoteConfig.getCached('count')).toBe(42);

    mockModule.getAllRemoteConfig.mockResolvedValueOnce(JSON.stringify({ flagA: false, count: 99 }));
    remoteConfigListener?.(); // native reports a change
    await flush();

    expect(AppDNA.remoteConfig.getCached('count')).toBe(99);
    expect(AppDNA.remoteConfig.getCached('flagA')).toBe(false);
  });

  it('shutdown clears the snapshot and its subscription', async () => {
    await AppDNA.remoteConfig.primeSnapshot();
    expect(AppDNA.remoteConfig.hasSnapshot()).toBe(true);
    await AppDNA.shutdown();
    expect(AppDNA.remoteConfig.hasSnapshot()).toBe(false);
    expect(AppDNA.remoteConfig.getCached('flagA')).toBeUndefined();
    expect(remoteConfigListener).toBeUndefined(); // unsubscribed
  });
});
