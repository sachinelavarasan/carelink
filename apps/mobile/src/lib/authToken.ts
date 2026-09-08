import * as SecureStore from 'expo-secure-store';

// Persistent copy of the access token, in the OS keychain / keystore. The live
// value used per-request lives in tokenStore.ts (in memory); this is only read
// once at startup and written on sign-in / sign-out.
const ACCESS_KEY = 'carelink.accessToken';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_KEY, token);
  } catch {
    // Keychain unavailable (e.g. locked device at boot) — the in-memory token
    // still carries the session for this launch.
  }
}

export async function clearStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
  } catch {
    // ignore
  }
}
