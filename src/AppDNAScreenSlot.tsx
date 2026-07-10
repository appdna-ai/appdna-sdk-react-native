// ADR-001 PlatformView carve-out (same as the Flutter ScreenSlot host): this facade hosts the native
// Fabric surface (AppdnaScreenSlotView) and manages only its measured height. It renders no UI of its
// own — no network, no storage, no business logic — so importing React to host the native view is
// allowed here and nowhere else. The marker must sit on the line directly above the import.
// thin-wrapper-ignore
import React, { useState, useCallback } from 'react';
import type { ViewStyle, StyleProp, NativeSyntheticEvent } from 'react-native';
import AppdnaScreenSlotView from './specs/AppdnaScreenSlotNativeComponent';

/**
 * SPEC-070-B P4 / W19 — the public React component for an inline, server-driven AppDNA screen slot.
 *
 * A slot renders whatever the console publishes for `name` — a native SwiftUI / Compose surface,
 * embedded through Fabric. See `specs/AppdnaScreenSlotNativeComponent.ts` for why height is driven
 * from JS and the two costs that entails.
 *
 * ```tsx
 * <AppDNAScreenSlot name="home_promo" minHeight={120} style={{ marginVertical: 16 }} />
 * ```
 */
export interface AppDNAScreenSlotProps {
  /** The console slot name to render. */
  name: string;

  /**
   * Height reserved before the first `onContentSizeChange` fires (W19). Without it the slot is 0pt on
   * the first frame and the layout visibly collapses, then expands one frame later. Pick a value near
   * the slot's expected height; the real measured height replaces it as soon as native reports one.
   * Defaults to 0 — a caller that wants no reserved space opts in explicitly.
   */
  minHeight?: number;

  /** Extra style for the slot container. `height` is managed internally and should not be set here. */
  style?: StyleProp<ViewStyle>;

  /** Notified with the measured content height whenever it changes (points/dp). */
  onContentSizeChange?: (size: { width: number; height: number }) => void;
}

export function AppDNAScreenSlot({
  name,
  minHeight = 0,
  style,
  onContentSizeChange,
}: AppDNAScreenSlotProps): React.ReactElement {
  // `undefined` until the first measure, so the reserved `minHeight` governs the first frame and the
  // measured height takes over afterwards.
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined);

  const handleSize = useCallback(
    (event: NativeSyntheticEvent<{ width: number; height: number }>) => {
      const { width, height } = event.nativeEvent;
      setMeasuredHeight(height);
      onContentSizeChange?.({ width, height });
    },
    [onContentSizeChange],
  );

  return (
    <AppdnaScreenSlotView
      name={name}
      onContentSizeChange={handleSize}
      style={[{ height: measuredHeight ?? minHeight }, style]}
    />
  );
}
