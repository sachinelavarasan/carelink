import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'carelink.accessToken';

export const authToken = {
  async getAccess(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async set(tokens: { accessToken: string }): Promise<void> {
    await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(ACCESS_KEY);
  },
};
