import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'carelink.accessToken';
const REFRESH_KEY = 'carelink.refreshToken';

export const authToken = {
  async getAccess(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async set(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, tokens.accessToken],
      [REFRESH_KEY, tokens.refreshToken],
    ]);
  },
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },
};
