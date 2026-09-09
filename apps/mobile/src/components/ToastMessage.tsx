import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Toast, { BaseToast, type ToastConfig } from 'react-native-toast-message';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Rough height of our custom BottomTabBar (BlurView + pill + label). Bottom
 *  toasts need to clear this plus the home-indicator inset. */
const TAB_BAR_HEIGHT = 56;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Mount once, near the root, above everything else. */
export function ToastMessage() {
  const { color: c } = useTheme();
  const insets = useSafeAreaInsets();

  const palette: Record<
    ToastType,
    { bg: string; accent: string; border: string; icon: IoniconName }
  > = {
    success: { bg: c['success-bg'], accent: c['success-fg'], border: c['success-border'], icon: 'checkmark-circle' },
    error: { bg: c['danger-bg'], accent: c['danger-fg'], border: c['danger-border'], icon: 'alert-circle' },
    warning: { bg: c['warning-bg'], accent: c['warning-fg'], border: c['warning-border'], icon: 'warning' },
    info: { bg: c.card, accent: c.primary, border: c.border, icon: 'information-circle' },
  };

  const text1 = { fontSize: 14, fontWeight: '600' as const, color: c.foreground };
  const text2 = { fontSize: 12, color: c['muted-foreground'] };

  const make = (type: ToastType): ToastConfig[string] => {
    const p = palette[type];
    return (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftWidth: 4,
          borderLeftColor: p.accent,
          backgroundColor: p.bg,
          borderColor: p.border,
        }}
        contentContainerStyle={{ paddingHorizontal: space.md }}
        text1Style={text1}
        text2Style={text2}
        text1NumberOfLines={2}
        text2NumberOfLines={3}
        renderLeadingIcon={() => (
          <View style={{ justifyContent: 'center', paddingLeft: space.md }}>
            <Ionicons name={p.icon} size={20} color={p.accent} />
          </View>
        )}
      />
    );
  };

  const config: ToastConfig = {
    success: make('success'),
    error: make('error'),
    warning: make('warning'),
    info: make('info'),
  };

  return (
    <Toast
      config={config}
      topOffset={insets.top + space.sm}
      bottomOffset={insets.bottom + TAB_BAR_HEIGHT + space.md}
    />
  );
}

const HAPTIC: Record<ToastType, () => Promise<void>> = {
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  info: () => Haptics.selectionAsync(),
};

export function showToast({
  type,
  text1,
  text2,
  position = 'bottom',
  visibilityTime = 3000,
}: {
  type: ToastType;
  text1: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
}) {
  void HAPTIC[type]();
  Toast.show({ type, text1, text2, position, visibilityTime, autoHide: true });
}
