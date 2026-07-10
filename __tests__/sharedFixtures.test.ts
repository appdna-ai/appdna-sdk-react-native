/**
 * sharedFixtures.test.ts
 *
 * Cross-platform behavioral fixture runner for React Native — SPEC-070-0
 * §3.2 + §3.3 step 7.
 *
 * Per ADR-001 the React Native TS layer is a THIN WRAPPER. This runner
 * verifies the **bridge contract**: for each fixture's `action`, calling
 * the SDK TS facade triggers the expected `NativeModules.AppdnaModule.<x>`
 * invocation with the correct args. The actual events / delegate_calls /
 * state_after assertions are validated by iOS + Android runners (which
 * exercise real native SDK code paths).
 *
 * PHASE 0.4 SCAFFOLDING NOTE
 * ---------------------------
 * The TS facade today exposes a narrow surface (configure, identify,
 * track, presentPaywall, presentOnboarding, ...). Phase 0.4 wires the
 * action kinds for which the facade exists today; the rest emit a soft
 * skip with reason "Phase 0.5+ assertion not yet implemented." CI stays
 * green; the skip count is the Phase 0.5 remaining-work gauge.
 *
 *   - track_event   → AppDNA.track(...)         — bridge: AppdnaModule.track
 *   - identify      → AppDNA.identify(...)      — bridge: AppdnaModule.identify
 *   - tap_button    → SKIP (no host-driven UI tap simulation in the TS
 *                          facade today; v1.0.60 dual-emit is purely
 *                          native-side. Asserted by iOS + Android.)
 *   - submit_form        → SKIP (onboarding render is native)
 *   - evaluate_audience  → SKIP (native-only API surface)
 *
 * FIXTURE PATH RESOLUTION
 * -----------------------
 *   1. APPDNA_SDK_FIXTURES_DIR env var (CI sets this absolute path)
 *   2. Walk up from __dirname until packages/sdk-shared-fixtures/ is found
 *   3. Codespace fallback: /workspaces/appdna-ai/packages/sdk-shared-fixtures
 *
 * react-native is mocked module-globally so importing `../src` works
 * without a real RN runtime. See `jest.mock('react-native', ...)` below.
 *
 * © 2026 AppDNA AI, Inc.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---- Mock the entire react-native module surface used by ../src --------

interface CapturedCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

const mockCapturedCalls: CapturedCall[] = [];
const mockEventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

/**
 * A stand-in TurboModule. Under the New Architecture the module exposes methods AND, for each event,
 * an emitter PROPERTY that takes a listener and returns a subscription — `onReady` is the one `on*`
 * name that is a method, and this mock reproduces that quirk rather than papering over it.
 */
const mockAppdnaModule = new Proxy(
  {},
  {
    get(_target, methodName: string) {
      if (methodName === 'then') return undefined; // not a thenable

      if (methodName.startsWith('on') && methodName !== 'onReady') {
        return (callback: (data: unknown) => void) => {
          const list = mockEventListeners.get(methodName) ?? [];
          list.push(callback);
          mockEventListeners.set(methodName, list);
          return { remove: () => undefined };
        };
      }

      return (...args: unknown[]) => {
        mockCapturedCalls.push({ method: methodName, args });
        return Promise.resolve(null);
      };
    },
  },
) as Record<string, (...args: unknown[]) => Promise<unknown>>;

jest.mock(
  'react-native',
  () => ({
    TurboModuleRegistry: {
      get: () => mockAppdnaModule,
      getEnforcing: () => mockAppdnaModule,
    },
    Platform: { OS: 'ios', select: <T,>(spec: { default?: T; ios?: T; android?: T }) => spec.ios ?? spec.default },
  }),
  { virtual: true },
);

// Import AFTER mock is registered.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppDNA } = require('../src');

// ---- Fixture types + loader -------------------------------------------

interface FixtureAction {
  readonly kind: string;
  // arbitrary additional fields
  readonly [k: string]: unknown;
}

interface Fixture {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly platforms: readonly string[];
  readonly setup?: Record<string, unknown>;
  readonly action: FixtureAction;
  readonly expect: {
    readonly events?: ReadonlyArray<{ name: string; properties?: Record<string, unknown> }>;
    readonly delegate_calls?: ReadonlyArray<{ name: string; args?: Record<string, unknown> }>;
    readonly state_after?: Record<string, unknown>;
    readonly errors?: ReadonlyArray<{ type: string; message?: string }>;
  };
}

function resolveFixturesRoot(): string {
  const env = process.env.APPDNA_SDK_FIXTURES_DIR;
  if (env && fs.existsSync(env)) return env;

  let here = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(here, 'packages', 'sdk-shared-fixtures');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(here);
    if (parent === here) break;
    here = parent;
  }
  const codespace = '/workspaces/appdna-ai/packages/sdk-shared-fixtures';
  if (fs.existsSync(codespace)) return codespace;
  throw new Error(
    'Could not locate packages/sdk-shared-fixtures. Set APPDNA_SDK_FIXTURES_DIR.',
  );
}

function walkFixtureFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
      } else if (stat.isFile() && name.endsWith('.fixture.json')) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function loadRnFixtures(): Fixture[] {
  const root = resolveFixturesRoot();
  const fixtures: Fixture[] = [];
  for (const filePath of walkFixtureFiles(root)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const fixture = JSON.parse(raw) as Fixture;
    // `render` (SPEC-419) and `events` (SPEC-428) fixtures carry no `action` — this behavioral runner
    // requires one. The event pipeline is native-owned (ADR-001), so its guarantees are asserted by the
    // iOS + Android EventPipeline runners; the RN thin wrapper only forwards track() to native.
    if (fixture.platforms.includes('rn') && fixture.category !== 'render' && fixture.category !== 'events') {
      fixtures.push(fixture);
    }
  }
  return fixtures;
}

// ---- Drivers + assertions ---------------------------------------------

interface FixtureSkip {
  readonly skipped: true;
  readonly reason: string;
}

async function runFixture(fixture: Fixture): Promise<FixtureSkip | undefined> {
  switch (fixture.action.kind) {
    case 'track_event': {
      // SPEC-070-B §18: the fixture key is `event_name`, not `event`. The driver read the wrong key
      // and papered over it with `?? 'unknown'` — so it drove a track('unknown') and asserted
      // against undefined. The suite never ran, so nobody saw it. A missing key is a broken
      // fixture; say so instead of inventing an event name.
      const event = fixture.action.event_name as string | undefined;
      if (!event) throw new Error(`[${fixture.id}] track_event fixture has no 'event_name'`);
      const properties = fixture.action.properties as
        | Record<string, unknown>
        | undefined;
      await AppDNA.track(event, properties);
      return undefined;
    }
    case 'identify': {
      const userId = fixture.action.userId as string | undefined;
      if (!userId) throw new Error(`[${fixture.id}] identify fixture has no 'userId'`);
      const traits = fixture.action.traits as
        | Record<string, unknown>
        | undefined;
      await AppDNA.identify(userId, traits);
      return undefined;
    }
    default:
      return {
        skipped: true,
        reason: `Phase 0.5+ assertion not yet implemented for action.kind=${fixture.action.kind}`,
      };
  }
}

function assertBridgeContract(fixture: Fixture): void {
  const id = fixture.id;
  switch (fixture.action.kind) {
    case 'track_event': {
      expect(mockCapturedCalls).toHaveLength(1);
      const c = mockCapturedCalls[0]!;
      expect(c.method).toBe('track');
      expect(c.args[0]).toBe(fixture.action.event_name);
      // SDK passes `properties ?? null` when undefined (per src/index.ts).
      expect(c.args[1]).toEqual(fixture.action.properties ?? null);
      break;
    }
    case 'identify': {
      expect(mockCapturedCalls).toHaveLength(1);
      const c = mockCapturedCalls[0]!;
      expect(c.method).toBe('identify');
      expect(c.args[0]).toBe(fixture.action.userId);
      expect(c.args[1]).toEqual(fixture.action.traits ?? null);
      break;
    }
    default:
      throw new Error(`[${id}] no bridge-contract assertion registered`);
  }
}

// ---- Test harness -----------------------------------------------------

const fixtures = loadRnFixtures();

describe('SharedFixtures (React Native bridge contract)', () => {
  beforeEach(() => {
    mockCapturedCalls.length = 0;
    mockEventListeners.clear();
  });

  it('fixtures directory contains at least one rn-applicable fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  describe.each(fixtures.map((f) => [f.id, f] as const))('%s', (_id, fixture) => {
    it(fixture.description, async () => {
      const skip = await runFixture(fixture);
      if (skip) {
        // eslint-disable-next-line no-console
        console.warn(`[sharedFixtures] SKIP ${fixture.id} — ${skip.reason}`);
        return;
      }
      assertBridgeContract(fixture);
    });
  });
});
