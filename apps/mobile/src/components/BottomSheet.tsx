import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Fixed detents, e.g. ['50%']. Omit to size to content (capped at ~85%). */
  snapPoints?: (string | number)[];
  children: ReactNode;
}

/**
 * Controlled wrapper around @gorhom/bottom-sheet's BottomSheetModal.
 * `BottomSheetModalProvider` is mounted at the app root (directly under
 * `GestureHandlerRootView`).
 *
 * Notes for the New Architecture (RN 0.86 / Fabric):
 *  - `present()` is deferred a frame — calling it in the same tick as the first
 *    mount silently no-ops and the sheet never appears.
 *  - content sizing needs a bound: `maxDynamicContentSize` + a real scroll
 *    container (`BottomSheetScrollView`), or the sheet opens at height 0.
 */
export function BottomSheet({ visible, onClose, title, snapPoints, children }: BottomSheetProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const ref = useRef<BottomSheetModal>(null);

  const memoSnapPoints = useMemo(() => snapPoints, [snapPoints]);
  const maxHeight = Math.round(height * 0.85) - insets.top;

  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => ref.current?.present());
      return () => cancelAnimationFrame(id);
    }
    ref.current?.dismiss();
    return undefined;
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={memoSnapPoints}
      enableDynamicSizing={!memoSnapPoints}
      maxDynamicContentSize={maxHeight}
      topInset={insets.top}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: color.card }}
      handleIndicatorStyle={{ backgroundColor: color.border }}
      keyboardBehavior="interactive"
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingBottom: space.lg + insets.bottom,
        }}
      >
        {title ? (
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: color.foreground,
              marginBottom: space.md,
            }}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
