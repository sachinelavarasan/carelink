import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface ModalCardProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  /** Count pill next to the title (e.g. active filters); hidden when falsy. */
  badge?: number;
  /** 'center' zoom card (default) or 'sheet' pinned to the bottom edge. */
  presentation?: 'center' | 'sheet';
  /** Pinned below the scroll area — for primary actions on long forms. */
  footer?: ReactNode;
  closeDisabled?: boolean;
  children: ReactNode;
}

/**
 * Centered or bottom-sheet modal card. Same surface as the Expensify app's
 * ModalCard, rebuilt on React Native's own `Modal` + an `expo-blur` backdrop
 * (no `react-native-modal` dependency).
 */
export function ModalCard({
  visible,
  onClose,
  title,
  badge,
  presentation = 'center',
  footer,
  closeDisabled,
  children,
}: ModalCardProps) {
  const { theme, color } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isSheet = presentation === 'sheet';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={closeDisabled ? undefined : onClose}
    >
      <Pressable
        onPress={closeDisabled ? undefined : onClose}
        style={{
          flex: 1,
          justifyContent: isSheet ? 'flex-end' : 'center',
          alignItems: isSheet ? 'stretch' : 'center',
          padding: isSheet ? 0 : 24,
        }}
      >
        <BlurView
          tint={theme === 'dark' ? 'dark' : 'light'}
          intensity={30}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: isSheet ? '100%' : '100%',
            maxWidth: isSheet ? undefined : 360,
            maxHeight: height * 0.82,
            backgroundColor: color.card,
            borderWidth: 1,
            borderColor: color.border,
            borderRadius: isSheet ? 0 : 18,
            borderTopLeftRadius: isSheet ? 22 : 18,
            borderTopRightRadius: isSheet ? 22 : 18,
            paddingHorizontal: 20,
            paddingTop: isSheet ? 10 : 18,
            paddingBottom: (isSheet ? 20 : 20) + (isSheet ? insets.bottom : 0),
          }}
        >
          {isSheet ? (
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: color.border,
                marginBottom: 14,
              }}
            />
          ) : null}

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 17, fontWeight: '700', color: color.foreground, flexShrink: 1 }}
                >
                  {title}
                </Text>
                {badge ? (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      paddingHorizontal: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: color.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: color['primary-foreground'] }}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              {onClose ? (
                <Pressable
                  onPress={onClose}
                  disabled={closeDisabled}
                  hitSlop={10}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color.muted,
                    opacity: closeDisabled ? 0.4 : 1,
                  }}
                >
                  <Ionicons name="close" size={18} color={color.foreground} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? (
            <View style={{ marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border }}>
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
