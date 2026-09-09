import type { ComponentProps } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Ported from the Expensify app's BottomTabBar: a blurred, translucent bar with
 * the active tab's icon on a solid brand-coloured pill and a label underneath.
 * Colours come from our token map (useTheme) instead of Expensify's palette.
 */
export default function BottomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { theme, color } = useTheme();

  const translucent = color.card.length === 7 ? `${color.card}CC` : color.card;

  return (
    <BlurView
      tint={theme === 'dark' ? 'dark' : 'light'}
      intensity={70}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: translucent,
        paddingBottom: 0,
        paddingTop: 5,
        borderTopColor: color.border,
        borderTopWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: theme === 'dark' ? 0.15 : 0.06,
        shadowRadius: 3,
        elevation: 0,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // expo-router keeps `href: null` screens in state.routes but hides them
        // with tabBarItemStyle.display === 'none' — skip those.
        if ((options.tabBarItemStyle as { display?: string } | undefined)?.display === 'none') {
          return null;
        }

        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            key={route.key}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 }}
          >
            <Animated.View
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: 4,
                alignItems: 'center',
                backgroundColor: isFocused ? color['primary-soft'] : 'transparent',
                borderRadius: radius.pill,
              }}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? color.primary : color['muted-foreground'],
                size: 24,
              })}
            </Animated.View>
            <Text
              style={{
                color: isFocused ? color.primary : color['muted-foreground'],
                fontWeight: isFocused ? '600' : '500',
                fontSize: 11,
                marginTop: 1,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
}
