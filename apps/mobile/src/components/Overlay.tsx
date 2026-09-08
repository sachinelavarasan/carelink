import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Full-screen dimmed spinner for blocking operations. Mount conditionally. */
export function Overlay() {
  const { color } = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 99,
      }}
    >
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}
