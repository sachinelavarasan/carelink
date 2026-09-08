import * as Haptics from 'expo-haptics';
import Toast, {
  BaseToast,
  ErrorToast,
  InfoToast,
  type ToastConfig,
} from 'react-native-toast-message';

import { tokens } from '@carelink/theme';
import { useTheme } from '@/theme/ThemeProvider';

type ToastType = 'success' | 'error' | 'info';

/** Mount once, near the root, above everything else. */
export function ToastMessage() {
  const { theme } = useTheme();
  const c = tokens[theme];

  const base = {
    borderLeftWidth: 4,
    backgroundColor: c.card,
    borderColor: c.border,
  } as const;
  const text1 = { fontSize: 14, fontWeight: '600' as const, color: c.foreground };
  const text2 = { fontSize: 12, color: c['muted-foreground'] };

  const config: ToastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={[base, { borderLeftColor: c['success-fg'] }]}
        text1Style={text1}
        text2Style={text2}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={[base, { borderLeftColor: c.destructive }]}
        text1Style={text1}
        text2Style={text2}
      />
    ),
    info: (props) => (
      <InfoToast
        {...props}
        style={[base, { borderLeftColor: c.primary }]}
        text1Style={text1}
        text2Style={text2}
      />
    ),
  };

  return <Toast config={config} />;
}

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
  void Haptics.notificationAsync(
    type === 'success'
      ? Haptics.NotificationFeedbackType.Success
      : type === 'error'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning,
  );
  Toast.show({ type, text1, text2, position, visibilityTime, autoHide: true });
}
