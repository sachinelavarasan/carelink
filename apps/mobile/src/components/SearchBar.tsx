import { Keyboard, Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
}

/** Icon + text + clear. Ported from the Expensify app's SearchBar, trimmed to
 *  the parts CareLink uses. */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  onSubmit,
  autoFocus,
}: SearchBarProps) {
  const { color } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: radius.sm,
        borderColor: color.border,
        backgroundColor: color.background,
        paddingHorizontal: 10,
      }}
    >
      <Ionicons name="search" size={18} color={color['muted-foreground']} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color['muted-foreground']}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        onSubmitEditing={() => {
          Keyboard.dismiss();
          onSubmit?.(value);
        }}
        style={{ flex: 1, paddingVertical: 10, fontSize: 16, color: color.foreground }}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={color['muted-foreground']} />
        </Pressable>
      ) : null}
    </View>
  );
}
