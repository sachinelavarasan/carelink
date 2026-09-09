import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, space } from '@/theme/tokens';

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

/** Centered card or bottom sheet on a plain dimmed scrim (RN `Modal`). */
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
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isSheet = presentation === 'sheet';

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType={isSheet ? 'slide' : 'fade'}
      onRequestClose={closeDisabled ? undefined : onClose}
    >
      {/* scrim — tap to dismiss */}
      <Pressable
        onPress={closeDisabled ? undefined : onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,20,0.55)',
          justifyContent: isSheet ? 'flex-end' : 'center',
          alignItems: isSheet ? 'stretch' : 'center',
          padding: isSheet ? 0 : space.xxl,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            {
              width: '100%',
              maxWidth: isSheet ? undefined : 380,
              maxHeight: height * 0.85,
              backgroundColor: color.card,
              borderTopLeftRadius: isSheet ? radius.lg + 6 : radius.lg,
              borderTopRightRadius: isSheet ? radius.lg + 6 : radius.lg,
              borderBottomLeftRadius: isSheet ? 0 : radius.lg,
              borderBottomRightRadius: isSheet ? 0 : radius.lg,
              borderWidth: isSheet ? 0 : 1,
              borderColor: color.border,
              paddingHorizontal: space.xl,
              paddingTop: isSheet ? space.md : space.xl,
              paddingBottom: space.xl + (isSheet ? insets.bottom : 0),
            },
            elevation.raised,
          ]}
        >
          {isSheet ? (
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: color['muted-foreground'],
                opacity: 0.3,
                marginBottom: space.md,
              }}
            />
          ) : null}

          {title ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: space.md,
                gap: space.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
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
            <View
              style={{
                marginTop: space.md,
                paddingTop: space.md,
                borderTopWidth: 1,
                borderTopColor: color.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
