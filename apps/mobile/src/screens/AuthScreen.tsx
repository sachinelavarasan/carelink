import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { errMessage, isStatus } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';

export function AuthScreen() {
  const { login, register } = useAuth();
  const { color } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ fullName, email, password });
        setNotice('Check your email for a verification link, then sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(
        isStatus(err, 403)
          ? 'Verify your email first — check your inbox.'
          : errMessage(err, 'Something went wrong'),
      );
    } finally {
      setBusy(false);
    }
  }

  const input =
    'rounded-md border border-input bg-background px-3 py-3 text-base text-foreground';

  return (
    <View className="flex-1 justify-center gap-3 bg-background px-6">
      <View className="absolute right-4 top-4">
        <ThemeToggle />
      </View>

      <Text className="text-center text-3xl font-bold text-foreground">CareLink</Text>
      <Text className="mb-2 text-center text-muted-foreground">
        {mode === 'login' ? 'Sign in' : 'Create an account'}
      </Text>

      {notice && <Text className="text-center text-success-fg">{notice}</Text>}
      {error && <Text className="text-center text-destructive">{error}</Text>}

      {mode === 'register' && (
        <TextInput
          className={input}
          placeholder="Full name"
          placeholderTextColor={color['muted-foreground']}
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        className={input}
        placeholder="Email"
        placeholderTextColor={color['muted-foreground']}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className={input}
        placeholder="Password"
        placeholderTextColor={color['muted-foreground']}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        className="mt-1 items-center rounded-md bg-primary p-3.5 disabled:opacity-50"
        onPress={submit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={color['primary-foreground']} />
        ) : (
          <Text className="font-semibold text-primary-foreground">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}>
        <Text className="mt-3 text-center text-primary">
          {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}
