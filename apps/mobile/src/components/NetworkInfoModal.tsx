import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useTheme } from '@/theme/ThemeProvider';

/** Thin banner pinned to the bottom while the device is offline. */
export function NetworkInfoModal() {
  const { color } = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(
    () => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)),
    [],
  );

  if (!offline) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: color['warning-bg'],
        borderTopWidth: 1,
        borderTopColor: color['warning-border'],
        paddingVertical: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: color['warning-fg'] }}>
        You&apos;re offline — showing saved data
      </Text>
    </View>
  );
}
