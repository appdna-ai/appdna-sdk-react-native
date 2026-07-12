/**
 * The example app is the ONLY executable proof this SDK works on a device — and it drove less than
 * half the surface.
 *
 * Not exercised at all, before this suite existed: four of the eight veto hooks (including
 * `onPromoCodeSubmit`, whose native default is REJECT and which has already shipped as a live
 * production defect); every billing call (`getProducts` / `purchase` / `restorePurchases` /
 * `getEntitlements` / `hasActiveSubscription` / `onEntitlementsChanged` — so the first-listener
 * entitlement-observer latch and the whole purchase path had never run on a device); every screens
 * call; every push call but `setDelegate`; experiments; remote-config priming; consent; `reset`;
 * `notifyScreenAppeared`; and `shutdown()`, whose teardown path four code comments claim to have fixed
 * four separate bugs in — none of which had ever executed outside jest.
 *
 * Nothing failed. A device pass simply confirmed the half that was wired.
 *
 * So this suite enumerates the public facade AT RUNTIME (not from a hand-written list, which would
 * rot the moment someone adds a method) and asserts the example calls each member. Add an API and
 * forget the example, and this goes red — which is the only way the gap above does not reopen.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AppDNA, AppDNABilling, AppDNAPush } from '../src';

const EXAMPLE_SOURCE = readFileSync(join(__dirname, '..', 'example', 'App.tsx'), 'utf8');

/** Statics that are not part of the driveable API surface. */
const NOT_API = new Set(['length', 'name', 'prototype']);

/**
 * Members the example deliberately does not call, each with the reason. An entry here is a claim that
 * has to survive review — which is the point of making the exception explicit rather than making the
 * enumeration lenient.
 */
const EXEMPT: Record<string, string> = {
  // Pre-namespace aliases kept for source compatibility. Each forwards to the namespaced method the
  // example DOES drive; calling both would only prove the alias forwards, which is a unit test's job
  // (and one exists), not a device pass's.
  'AppDNA.presentPaywall': 'alias of AppDNA.paywall.present',
  'AppDNA.presentOnboarding': 'alias of AppDNA.onboarding.present',
  'AppDNA.getRemoteConfig': 'alias of AppDNA.remoteConfig.get',
  'AppDNA.isFeatureEnabled': 'alias of AppDNA.features.isEnabled',
  'AppDNA.getExperimentVariant': 'alias of AppDNA.experiments.getVariant',
  'AppDNA.isInVariant': 'alias of AppDNA.experiments.isInVariant',
  'AppDNA.setPushToken': 'alias of AppDNA.push.setToken',
  'AppDNA.setPushPermission': 'alias of AppDNA.push.setPermission',
  'AppDNA.trackPushDelivered': 'alias of AppDNA.push.trackDelivered',
  'AppDNA.trackPushTapped': 'alias of AppDNA.push.trackTapped',

  // Driven, but not by a literal `X.y(` call site:
  //  - `configure` / `track` / `onReady` are called in `boot()` and the Track button.
  //  - the eight `setDelegate`s are called in `registerDelegates()`.
  // They are matched by the explicit assertions further down instead, which check the exact call.
};

/** `AppDNA.billing.purchase` → the substring the example must contain: `AppDNA.billing.purchase(`. */
function callSite(path: string): string {
  return `${path}(`;
}

/** Every callable member of a facade object/class, as `Root.member` / `Root.namespace.member`. */
function surfaceOf(root: string, target: object): string[] {
  const out: string[] = [];
  for (const key of Object.getOwnPropertyNames(target)) {
    if (NOT_API.has(key)) continue;
    const value = (target as Record<string, unknown>)[key];
    if (typeof value === 'function') {
      out.push(`${root}.${key}`);
    } else if (value && typeof value === 'object') {
      // A namespace (`AppDNA.billing`, `AppDNA.push`, …).
      for (const inner of Object.keys(value)) {
        if (typeof (value as Record<string, unknown>)[inner] === 'function') {
          out.push(`${root}.${key}.${inner}`);
        }
      }
    }
  }
  return out;
}

/** The whole public surface, enumerated at runtime so a new API appears here without anyone's help. */
const SURFACE: string[] = [
  ...surfaceOf('AppDNA', AppDNA),
  ...surfaceOf('AppDNABilling', AppDNABilling),
  ...surfaceOf('AppDNAPush', AppDNAPush),
];

describe('the example app drives the whole public surface', () => {
  it('enumerates a surface at all (a zero-length list would make every assertion below vacuous)', () => {
    expect(SURFACE.length).toBeGreaterThan(40);
    // Spot-check the enumeration itself: namespaces must be walked, not just top-level statics.
    expect(SURFACE).toContain('AppDNA.billing.purchase');
    expect(SURFACE).toContain('AppDNA.screens.showFlow');
    expect(SURFACE).toContain('AppDNAPush.onPushTapped');
  });

  it.each(SURFACE)('example/App.tsx calls %s', (path) => {
    if (EXEMPT[path]) return; // exempt, with a stated reason
    expect(EXAMPLE_SOURCE).toContain(callSite(path));
  });

  it('registers all eight veto hooks — the four that were missing are the ones with teeth', () => {
    // `onPromoCodeSubmit` defaults to REJECT natively; `onBeforeStepRender` runs on EVERY step, and a
    // host that does not answer it makes native sit out the full veto timeout before every step.
    for (const hook of [
      'onBeforeStepAdvance',
      'onBeforeStepRender',
      'onElementInteraction',
      'onPermissionRequest',
      'onPromoCodeSubmit',
      'shouldShowMessage',
      'shouldOpen',
      'onScreenAction',
    ]) {
      expect(EXAMPLE_SOURCE).toContain(`${hook}:`);
    }
  });

  it('sets all nine delegates, and does so BEFORE configure()', () => {
    for (const ns of [
      'AppDNA.onboarding.setDelegate',
      'AppDNA.paywall.setDelegate',
      'AppDNA.surveys.setDelegate',
      'AppDNA.inAppMessages.setDelegate',
      'AppDNA.push.setDelegate',
      'AppDNA.deepLinks.setDelegate',
      'AppDNA.lifecycle.setDelegate',
      'AppDNA.screens.setDelegate',
      'AppDNABilling.setDelegate',
    ]) {
      expect(EXAMPLE_SOURCE).toContain(`${ns}(`);
      // Native starts emitting DURING configure; a delegate registered after it misses the opening
      // events, and that is not something a device pass would ever notice.
      expect(EXAMPLE_SOURCE.indexOf(`${ns}(`)).toBeLessThan(EXAMPLE_SOURCE.indexOf('AppDNA.configure('));
    }
  });

  it('configures with EVERY option native parses — the defaults path was the only one exercised', () => {
    for (const option of [
      'flushInterval',
      'batchSize',
      'configTTL',
      'logLevel',
      'vetoTimeout',
      'billingProvider',
      'requireConsent',
    ]) {
      expect(EXAMPLE_SOURCE).toContain(`${option}:`);
    }
    expect(EXAMPLE_SOURCE).toContain('AppDNA.configure(apiKey');
  });

  it('drives shutdown() and a reconfigure after it — the teardown path had never run on a device', () => {
    expect(EXAMPLE_SOURCE).toContain('AppDNA.shutdown()');
    // The four bugs fixed in that path (config snapshot, delegate listeners, veto handlers,
    // entitlement-observer latch) only reproduce on the SECOND configure.
    expect(EXAMPLE_SOURCE).toContain('Reconfigure');
  });

  it('mounts the screen slot with non-default props', () => {
    // A slot mounted once with defaults exercises neither the measured-height callback nor the live
    // `name` change (whose height-cache bug is the reason that code path exists).
    expect(EXAMPLE_SOURCE).toContain('onContentSizeChange={');
    expect(EXAMPLE_SOURCE).toContain('minHeight={');
    expect(EXAMPLE_SOURCE).toContain('setSlot(');
  });

  it('carries the SAME launch props on both native hosts', () => {
    // 🔴 The Android host forwarded ONLY `apiKey` while iOS forwarded six props, so every content id
    // arrived `undefined` on Android and the example fell back to the id "default" — which exists in no
    // console. `present("default")` resolves false and logs nothing, so an Android device pass looked
    // like a pass while presenting nothing at all.
    const appDelegate = readFileSync(
      join(__dirname, '..', 'example', 'ios', 'AppdnaExample', 'AppDelegate.mm'),
      'utf8',
    );
    const mainActivity = readFileSync(
      join(
        __dirname, '..', 'example', 'android', 'app', 'src', 'main', 'java', 'com', 'appdnaexample',
        'MainActivity.kt',
      ),
      'utf8',
    );

    const iosArgs = [...appDelegate.matchAll(/@"(appdna[A-Za-z0-9]+)"\s*:\s*@"([A-Za-z0-9]+)"/g)]
      .map(([, arg, prop]) => `${arg}→${prop}`)
      .sort();
    const androidArgs = [...mainActivity.matchAll(/"(appdna[A-Za-z0-9]+)"\s*to\s*"([A-Za-z0-9]+)"/g)]
      .map(([, arg, prop]) => `${arg}→${prop}`)
      .sort();

    expect(iosArgs.length).toBeGreaterThan(6);
    expect(androidArgs).toEqual(iosArgs);

    // …and every prop they inject must be one the app actually accepts.
    for (const pair of iosArgs) {
      const prop = pair.split('→')[1];
      expect(EXAMPLE_SOURCE).toContain(prop);
    }
  });

  it('still commits NO API key (the example is force-pushed to a public mirror)', () => {
    // `check:example-no-key` is the real gate; this is the same claim asserted where the example is
    // edited, so a key added here fails in the suite the author is already running.
    expect(EXAMPLE_SOURCE).not.toMatch(/adn_(live|test)_[A-Za-z0-9]/);
    expect(EXAMPLE_SOURCE).toContain('apiKey');
  });
});
