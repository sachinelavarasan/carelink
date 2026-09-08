import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Fixed heights, e.g. ['50%']. Omit for content-height (dynamic) sizing. */
  snapPoints?: (string | number)[];
  children: ReactNode;
}

/**
 * Controlled wrapper around @gorhom/bottom-sheet's BottomSheetModal — backdrop,
 * grab handle, optional title, safe-area padding. `BottomSheetModalProvider` is
 * mounted in the root layout. Put scrollable content in a
 * `BottomSheetFlatList` / `BottomSheetScrollView` from the same package.
 */
export function BottomSheet({ visible, onClose, title, snapPoints, children }: BottomSheetProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
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
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: color.card }}
      handleIndicatorStyle={{ backgroundColor: color.border }}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 16 + insets.bottom }}>
        {title ? (
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: color.foreground,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>
        ) : null}
        <View>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
