import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Show a text box; its value is returned on confirm. */
  withInput?: boolean;
  inputPlaceholder?: string;
  inputMinLength?: number;
}

/** Resolves to the input string on confirm (`''` when `withInput` is off),
 *  or `false` on cancel / dismiss. */
type ConfirmFn = (options: ConfirmOptions) => Promise<string | false>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [text, setText] = useState('');
  const resolver = useRef<((v: string | false) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setText('');
    setOpts(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: string | false) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const canConfirm =
    !opts?.withInput || text.trim().length >= (opts?.inputMinLength ?? 1);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={opts !== null}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable
          onPress={() => close(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              gap: 12,
              borderRadius: 14,
              backgroundColor: color.card,
              borderWidth: 1,
              borderColor: color.border,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: color.foreground }}>
              {opts?.title}
            </Text>
            {opts?.message ? (
              <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{opts.message}</Text>
            ) : null}

            {opts?.withInput ? (
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={opts.inputPlaceholder}
                placeholderTextColor={color['muted-foreground']}
                multiline
                style={{
                  minHeight: 64,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: color.input,
                  backgroundColor: color.background,
                  padding: 10,
                  fontSize: 15,
                  color: color.foreground,
                }}
              />
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Button
                label={opts?.cancelLabel ?? 'Cancel'}
                variant="outline"
                onPress={() => close(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={opts?.confirmLabel ?? 'Confirm'}
                variant={opts?.destructive ? 'destructive' : 'primary'}
                disabled={!canConfirm}
                onPress={() => close(opts?.withInput ? text.trim() : '')}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
