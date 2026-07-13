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

const mockModule = {
  purchase: jest.fn(async () => mockTransaction),
  getProducts: jest.fn(async () => [mockIosProduct, mockAndroidProduct]),
  // `List<String>` — restored product IDs. NOT `Entitlement[]`, whatever the docs used to say.
  restorePurchases: jest.fn(async () => ['premium_monthly']),
  presentOnboarding: jest.fn(async () => true),
  presentPaywall: jest.fn(async () => undefined),
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
