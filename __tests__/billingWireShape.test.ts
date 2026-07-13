/**
 * The billing wire shape, asserted against what the NATIVE MAPPERS ACTUALLY EMIT.
 *
 * `sharedFixtures.test.ts` mocks every native method to `Promise.resolve(null)`. That is why two
 * pieces of pure fiction survived every green run this package ever had:
 *
 *   1. `purchase()` was typed `Promise<PurchaseResult>` — `{status: 'purchased'|…, entitlement?}`.
 *      Both natives resolve `AppdnaMappers.map(TransactionInfo)`, so `result.status === 'purchased'`
 *      was ALWAYS FALSE after a successful buy and `result.entitlement` was always `undefined`. The
 *      other three statuses were unreachable: a cancel / pending / failure THROWS natively and
 *      arrives as a promise REJECTION. Every `switch (result.status)` a host wrote fell to `default`.
 *
 *   2. `ProductInfo.price: number` — neither mapper has ever emitted `price`. Both emit
 *      `priceMicros`. `product.price.toFixed(2)` threw on `undefined` in a host app.
 *
 * So the mocks below are the mapper outputs, key for key (`ios/AppdnaMappers.swift` and
 * `android/.../AppdnaMappers.kt`). A mock that resolves `null` proves nothing about a shape.
 *
 * The `@ts-expect-error` lines are the regression gate, and they are load-bearing: `tsc` FAILS on an
 * unused `@ts-expect-error`, so if `status` or `price` ever come back to the type, the typecheck goes
 * red here. A runtime assertion alone cannot catch a type that lies — which is precisely how these
 * two shipped.
 */

/** iOS `AppdnaMappers.map(_ tx: TransactionInfo)` / Android `AppdnaMappers.map(tx)` — key for key. */
const mockTransaction = {
  transactionId: '2000000512345678',
  productId: 'premium_monthly',
  purchaseDate: '2026-07-12T09:15:00Z',
  environment: 'sandbox',
};

/** iOS `AppdnaMappers.map(_ product: ProductInfo)`: priceMicros + isSubscription, no currencyCode. */
const mockIosProduct = {
  id: 'premium_monthly',
  name: 'Premium Monthly',
  description: 'Everything, monthly.',
  displayPrice: '$9.99',
  priceMicros: 9_990_000,
  isSubscription: true,
};

/** Android `AppdnaMappers.map(product)`: priceMicros + currencyCode + offerToken, no isSubscription. */
const mockAndroidProduct = {
  id: 'premium_yearly',
  name: 'Premium Yearly',
  description: 'Everything, yearly.',
  displayPrice: '$79.99',
  priceMicros: 79_990_000,
  currencyCode: 'USD',
  offerToken: 'offer-abc',
};

/**
 * iOS `AppdnaMappers.map(_ entitlement: Entitlement)` — key for key.
 *
 * `identifier` + `productId` + `isActive`, and `expiresAt` OMITTED when there is no expiry (the mapper
 * refuses to bridge NSNull: "absent means no expiry"). There is no `store`, no `status`, no `isTrial`,
 * no `offerType` — iOS's core `Entitlement` has no such concepts.
 */
const mockIosEntitlement = {
  identifier: 'premium',
  productId: 'premium_monthly',
  isActive: true,
};

/** Android `AppdnaMappers.map(entitlement)` — the union, with `isActive` synthesised from `status`. */
const mockAndroidEntitlement = {
  identifier: 'premium_yearly',
  productId: 'premium_yearly',
  isActive: true,
  expiresAt: '2027-01-01T00:00:00Z',
  store: 'play',
  status: 'trialing',
  isTrial: true,
  offerType: 'free_trial',
};

const mockModule = {
  purchase: jest.fn(async () => mockTransaction),
  getProducts: jest.fn(async () => [mockIosProduct, mockAndroidProduct]),
  // `List<String>` — restored product IDs. NOT `Entitlement[]`, whatever the docs used to say.
  restorePurchases: jest.fn(async () => ['premium_monthly']),
  getEntitlements: jest.fn(async () => [mockIosEntitlement, mockAndroidEntitlement]),
  startEntitlementObserver: jest.fn(async () => undefined),
  presentOnboarding: jest.fn(async () => true),
  presentPaywall: jest.fn(async () => true),
  presentPaywallByPlacement: jest.fn(async () => false),
  // The sentinel `requireNativeModule` checks to detect the legacy bridge.
  onInitDegraded: () => ({ remove: () => undefined }),
};

jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => mockModule, getEnforcing: () => mockModule },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

import { AppDNA } from '../src';
import type { AppDNABillingProvider, AppDNAOptions } from '../src/types';

describe('purchase() resolves a TransactionInfo, not an invented status union', () => {
  it('resolves exactly the four keys the mappers emit', async () => {
    const tx = await AppDNA.billing.purchase('premium_monthly');

    expect(tx).toEqual(mockTransaction);
    expect(Object.keys(tx).sort()).toEqual([
      'environment', 'productId', 'purchaseDate', 'transactionId',
    ]);
  });

  it('carries neither of the two fields the old type promised', async () => {
    const tx = (await AppDNA.billing.purchase('premium_monthly')) as unknown as Record<string, unknown>;

    // A host that branched on these got `undefined` on the happy path — for both of them, always.
    expect(tx.status).toBeUndefined();
    expect(tx.entitlement).toBeUndefined();
  });

  it('has no `status` field in its TYPE either', async () => {
    const tx = await AppDNA.billing.purchase('premium_monthly');
    // @ts-expect-error — `status` is not on TransactionInfo. Under the old `PurchaseResult` this
    // compiled cleanly, which is exactly how the fiction survived: `tsc` was green on a lie.
    void tx.status;
    // @ts-expect-error — likewise `entitlement`. Entitlements come from `getEntitlements()` /
    // `onEntitlementsChanged`, which is where they have always actually come from.
    void tx.entitlement;
    expect(tx.transactionId).toBe('2000000512345678');
  });

  it('passes the offerToken through as the second argument', async () => {
    await AppDNA.billing.purchase('premium_yearly', 'offer-abc');
    expect(mockModule.purchase).toHaveBeenCalledWith('premium_yearly', 'offer-abc');
  });
});

describe('ProductInfo carries priceMicros — the field that actually crosses the bridge', () => {
  it('exposes priceMicros, and no `price`', async () => {
    const [ios, android] = await AppDNA.billing.getProducts(['premium_monthly', 'premium_yearly']);

    expect(ios!.priceMicros).toBe(9_990_000);
    expect(android!.priceMicros).toBe(79_990_000);
    // The field the old type promised. `product.price.toFixed(2)` threw on this `undefined`.
    expect((ios as unknown as Record<string, unknown>).price).toBeUndefined();
  });

  it('has no `price` field in its TYPE either', async () => {
    const [product] = await AppDNA.billing.getProducts(['premium_monthly']);
    // @ts-expect-error — there is no `price: number`; both mappers emit `priceMicros`.
    void product!.price;
    expect(product!.displayPrice).toBe('$9.99');
  });

  it('keeps the platform-specific keys optional, and omitted rather than faked (N11)', async () => {
    const [ios, android] = await AppDNA.billing.getProducts(['premium_monthly', 'premium_yearly']);

    // iOS: `isSubscription`, no currency code — its ProductInfo does not expose one.
    expect(ios!.isSubscription).toBe(true);
    expect(ios!.currencyCode).toBeUndefined();
    // Android: `currencyCode` + `offerToken`, no `isSubscription` — Play's DTO does not surface it.
    expect(android!.currencyCode).toBe('USD');
    expect(android!.offerToken).toBe('offer-abc');
    expect(android!.isSubscription).toBeUndefined();
  });
});

/**
 * 🔴 `Entitlement` — the one shape this file used to skip, and the one that lied hardest.
 *
 * The type declared `{productId, store, status, expiresAt, isTrial, offerType}`, ALL REQUIRED, and it
 * matched NEITHER mapper. `identifier` and `isActive` — the two keys BOTH platforms send, and the only
 * ones a host can act on cross-platform — were not on the type at all. Meanwhile `status` was typed
 * `string` while being ABSENT on iOS, so `if (e.status === 'active')` compiled, ran, and was ALWAYS
 * FALSE there: an iOS subscriber read as unentitled, forever, with no error anywhere.
 *
 * These mocks ARE the two mappers' outputs. The `@ts-expect-error` lines are the regression gate:
 * `tsc` fails on an UNUSED `@ts-expect-error`, so if the fields ever go back to being required, the
 * typecheck goes red here. A runtime assertion cannot catch a type that lies — which is how this one
 * survived every green run the package ever had.
 */
describe('Entitlement is the union both mappers actually emit', () => {
  it('carries identifier + productId + isActive on BOTH platforms', async () => {
    const [ios, android] = await AppDNA.billing.getEntitlements();

    // The cross-platform question. Neither key existed on the old type.
    expect(ios!.identifier).toBe('premium');
    expect(ios!.isActive).toBe(true);
    expect(android!.isActive).toBe(true);
    // Android synthesises `isActive` from a Play status a host should never have to learn.
    expect(android!.status).toBe('trialing');
  });

  it('omits the platform-specific keys on iOS rather than faking them (N11)', async () => {
    const [ios] = await AppDNA.billing.getEntitlements();

    expect(Object.keys(ios!).sort()).toEqual(['identifier', 'isActive', 'productId']);
    // These were REQUIRED on the old type. Every one of them is `undefined` on a real iOS device.
    const raw = ios as unknown as Record<string, unknown>;
    expect(raw.status).toBeUndefined();
    expect(raw.store).toBeUndefined();
    expect(raw.isTrial).toBeUndefined();
    expect(raw.expiresAt).toBeUndefined();
  });

  it('makes the iOS-absent fields OPTIONAL in the TYPE — the old ones were required', async () => {
    const [ios] = await AppDNA.billing.getEntitlements();

    // @ts-expect-error — `status` is `string | undefined` (Android-only). Under the old type it was a
    // required `string`, so this assignment compiled — and on iOS it assigned `undefined` to a
    // `string`, which is the whole defect in one line.
    const status: string = ios!.status;
    // @ts-expect-error — same for `store`.
    const store: string = ios!.store;
    // @ts-expect-error — a missing expiry is an OMITTED key, so `expiresAt` is `string | undefined`.
    // The old type said `string | null`, which is the shape of this assignment — and it told hosts
    // that `if (e.expiresAt === null)` would fire. It never did, on EITHER platform: the key is not
    // sent at all, so the value is `undefined`.
    const expiresAt: string | null = ios!.expiresAt;
    expect(expiresAt).toBeUndefined();

    expect([status, store]).toHaveLength(2);
  });
});

describe('restorePurchases() resolves product IDs, not entitlements', () => {
  it('resolves a string[] — the docs claimed Entitlement[]', async () => {
    const restored = await AppDNA.billing.restorePurchases();

    expect(restored).toEqual(['premium_monthly']);
    expect(typeof restored[0]).toBe('string');
  });
});

describe('presentOnboarding takes a flowId and nothing else', () => {
  it('calls native with one argument', async () => {
    await AppDNA.onboarding.present('welcome');

    // The `context` argument used to be marshalled here, forwarded by the ObjC++ adapter, accepted by
    // both native impls — and read by neither. A host setting `experimentOverrides` got a no-op.
    expect(mockModule.presentOnboarding).toHaveBeenCalledWith('welcome');
  });

  it('rejects a context argument at compile time', async () => {
    // @ts-expect-error — the dead `context` parameter is gone from the public signature. If it ever
    // returns, it must be because a native reads it.
    await AppDNA.onboarding.present('welcome', { experimentOverrides: { exp_1: 'variant_b' } });
  });
});

/**
 * 🔴 `PaywallContext.experiment` / `.variant` were absent from the TS type while BOTH natives parsed
 * them (ios/AppdnaModuleImpl.swift:766-767, android/.../AppdnaModule.kt:847-848). TypeScript rejects
 * an excess property, so a JS host could not send them at all — the native side was reading fields the
 * wrapper made it impossible to provide. Nothing crashed and nothing logged; the paywall simply was
 * never attributed to the experiment that served it.
 *
 * This asserts the WIRE, not the type: that all four fields survive the crossing. A type-only fix with
 * no test is how the surface went dead in the first place.
 */
/**
 * 🔴 `present()` RESOLVED SUCCESSFULLY WHEN NOTHING WAS SHOWN.
 *
 * An unknown paywall id, an unconfigured SDK, a runtime-locked SDK (suspended tenant) — all three
 * logged a native line and returned `void`, and the wrapper resolved. `await
 * AppDNA.paywall.present('typo_id')` reported success and no paywall ever appeared: a host could ship
 * a typo'd id to production and every signal it had said the paywall was working.
 *
 * `presentOnboarding` and `showScreen` have always returned a Boolean. Both natives now do the same
 * lookup up front — `PaywallManager.hasPaywall(id:)` / `hasPaywallForPlacement` — and the wrapper
 * hands that answer to the promise. `false` also covers "no host view / Activity", which used to
 * reject with `NO_VIEW_CONTROLLER` on iOS and `NO_ACTIVITY` on Android: the same condition, two codes,
 * so a host had to branch on `Platform.OS` to catch its own error.
 */
describe('present() reports whether a paywall was actually presented', () => {
  it('resolves the native boolean, not undefined', async () => {
    const shown = await AppDNA.paywall.present('pw_1');
    const notShown = await AppDNA.paywall.presentByPlacement('no_such_placement');

    expect(shown).toBe(true);
    // The case that used to be indistinguishable from success.
    expect(notShown).toBe(false);
  });

  it('is typed `Promise<boolean>`, so `if (!shown)` compiles', async () => {
    const shown: boolean = await AppDNA.paywall.present('pw_1');
    // @ts-expect-error — it is NOT `Promise<void>` any more. Under the old type this assignment was
    // the error, which is why no host ever checked the result: there was nothing to check.
    const asVoid: void = await AppDNA.paywall.present('pw_1');

    expect([shown, asVoid]).toHaveLength(2);
  });
});

describe('PaywallContext carries every field the natives read', () => {
  it('experiment and variant reach the native module', async () => {
    await AppDNA.paywall.present('pw_1', {
      placement: 'upgrade',
      experiment: 'exp_pricing_q3',
      variant: 'treatment_b',
      customData: { source: 'settings' },
    });

    expect(mockModule.presentPaywall).toHaveBeenCalledWith('pw_1', {
      placement: 'upgrade',
      experiment: 'exp_pricing_q3',
      variant: 'treatment_b',
      customData: { source: 'settings' },
    });
  });
});

/**
 * 🔴 Adapty was UNREACHABLE from TypeScript.
 *
 * Both natives parse `billingProvider` as either a bare string or a TAGGED MAP — Adapty is the one
 * provider carrying an associated value (its SDK key), so it can only cross as `{type, apiKey}`.
 * `AppDNABillingProvider` listed only the three bare strings, so an RN host could not select Adapty
 * at all while iOS, Android and Flutter hosts could.
 *
 * And the failure mode for anyone who forced it past the type was worse than a compile error: a bare
 * `'adapty'` matches NEITHER native (both deliberately refuse a keyless Adapty rather than run it
 * without a key), both fall through to the default, and purchases route silently to StoreKit / Play
 * Billing instead of Adapty. Money to the wrong processor, no error anywhere.
 *
 * These assertions are about the TYPE, which is the thing that was wrong — the wire shape it produces
 * is already covered above. `@ts-expect-error` is the oracle: it FAILS THE BUILD if the erroneous
 * form ever starts compiling, so it pins the keyless case closed rather than merely not testing it.
 */
describe('billingProvider — the Adapty tagged map (AC-21 / N1)', () => {
  it('accepts the tagged map, which is the only shape that carries the key', () => {
    const opts: AppDNAOptions = { billingProvider: { type: 'adapty', apiKey: 'public_live_xxx' } };
    expect(opts.billingProvider).toEqual({ type: 'adapty', apiKey: 'public_live_xxx' });
  });

  it('still accepts the three bare-string providers', () => {
    const providers: AppDNABillingProvider[] = ['storeKit2', 'revenueCat', 'none'];
    expect(providers).toHaveLength(3);
  });

  it('makes a KEYLESS adapty impossible to write — the case that silently fell back to StoreKit', () => {
    // @ts-expect-error a bare 'adapty' carries no apiKey; both natives refuse it and fall back to the
    // platform store, so the type must refuse it first.
    const bare: AppDNABillingProvider = 'adapty';
    // @ts-expect-error the tag alone is not enough either — the key is the whole point.
    const keyless: AppDNABillingProvider = { type: 'adapty' };
    expect([bare, keyless]).toHaveLength(2);
  });
});
