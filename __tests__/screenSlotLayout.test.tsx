/**
 * SPEC-070-B W19 / AC-37 — the ScreenSlot must not produce a visible layout shift.
 *
 * AC-17 permits a 0-height first frame at the MEASUREMENT layer; AC-37 forbids it reaching the
 * screen. Two distinct shifts have to be ruled out:
 *
 *   1. FIRST mount — the slot has never been measured, so it reserves `minHeight` rather than
 *      collapsing to 0 and expanding a frame later.
 *   2. RE-mount — a tab switch / list recycle / navigation-back destroys component state. Without a
 *      cache the slot would drop back to `minHeight` and shift again when the measurement lands, on
 *      every remount forever. It must come back at its last known height instead.
 *
 * The assertion is the `height` actually handed to the native view, which is the number that decides
 * whether the user sees a jump.
 */

const mockModule = {
  onInitDegraded: () => ({ remove: () => undefined }),
  onHostCallback: () => ({ remove: () => undefined }),
};

jest.mock('react-native', () => ({
  TurboModuleRegistry: { get: () => mockModule, getEnforcing: () => mockModule },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

// The Fabric component is a native view: in a jest runtime it must be a plain host element whose
// props we can read. Its identity ('AppdnaScreenSlotView') is what the renderer will show up as.
jest.mock('../src/specs/AppdnaScreenSlotNativeComponent', () => 'AppdnaScreenSlotView');

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppDNAScreenSlot, __resetScreenSlotHeightCache } from '../src/AppDNAScreenSlot';

/** The `height` the slot hands to the native view — the number the user sees as layout. */
function heightOf(tree: TestRenderer.ReactTestRenderer): number | undefined {
  const view = tree.root.findByType('AppdnaScreenSlotView' as unknown as React.ElementType);
  const style = view.props.style as Array<{ height?: number }>;
  return style.flat().find((s) => s && s.height !== undefined)?.height;
}

/** Deliver a native measurement, as the Fabric view would. */
function measure(tree: TestRenderer.ReactTestRenderer, height: number): void {
  const view = tree.root.findByType('AppdnaScreenSlotView' as unknown as React.ElementType);
  act(() => {
    view.props.onContentSizeChange({ nativeEvent: { width: 390, height } });
  });
}

beforeEach(() => {
  __resetScreenSlotHeightCache();
});

describe('W19 — ScreenSlot layout shift', () => {
  it('reserves minHeight on a first, never-measured mount (no 0-height flash)', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<AppDNAScreenSlot name="home_promo" minHeight={120} />);
    });
    expect(heightOf(tree)).toBe(120);
  });

  it('adopts the measured height once native reports one', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<AppDNAScreenSlot name="home_promo" minHeight={120} />);
    });
    measure(tree, 240);
    expect(heightOf(tree)).toBe(240);
  });

  it('REMOUNTS at the last known height, not back at minHeight (no shift on remount)', () => {
    let first!: TestRenderer.ReactTestRenderer;
    act(() => {
      first = TestRenderer.create(<AppDNAScreenSlot name="home_promo" minHeight={120} />);
    });
    measure(first, 240);
    act(() => first.unmount());

    // A tab switch back. Without the cache this would be 120 → then jump to 240: a visible shift.
    let second!: TestRenderer.ReactTestRenderer;
    act(() => {
      second = TestRenderer.create(<AppDNAScreenSlot name="home_promo" minHeight={120} />);
    });
    expect(heightOf(second)).toBe(240);
  });

  it('caches per slot name — a different slot does not inherit a foreign height', () => {
    let promo!: TestRenderer.ReactTestRenderer;
    act(() => {
      promo = TestRenderer.create(<AppDNAScreenSlot name="home_promo" minHeight={120} />);
    });
    measure(promo, 240);

    let footer!: TestRenderer.ReactTestRenderer;
    act(() => {
      footer = TestRenderer.create(<AppDNAScreenSlot name="footer_banner" minHeight={60} />);
    });
    // `footer_banner` has never been measured: it must reserve ITS minHeight, not home_promo's 240.
    expect(heightOf(footer)).toBe(60);
  });
});
