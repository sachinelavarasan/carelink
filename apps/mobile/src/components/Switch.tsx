import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

const TRACK_W = 42;
const TRACK_H = 25;
const THUMB = 21;
const PAD = 2;

/** Animated toggle. Ported from the Expensify app's Switch, re-tokened. */
export function Switch({
  value = false,
  onChange,
  disabled = false,
}: {
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [color.border, color.primary]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, TRACK_W - THUMB - PAD * 2]) }],
  }));

  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!value)}
      hitSlop={8}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          { width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, padding: PAD, justifyContent: 'center' },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
