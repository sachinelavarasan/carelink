import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';

const ONE_DAY = 1000 * 60 * 60 * 24;

/** Shared client. `gcTime` outlives the session so the persisted cache is useful
 *  on a cold start; screens still refetch on mount for freshness. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_DAY,
      staleTime: 30_000,
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'CARELINK_QUERY_CACHE',
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: ONE_DAY,
} as const;

// React Query's online state follows real connectivity, so mutations pause
// offline instead of failing.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);

// Treat "app returned to the foreground" as a refetch trigger (RN has no
// window focus event).
AppState.addEventListener('change', (state) => {
  focusManager.setFocused(state === 'active');
});
