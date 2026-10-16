import * as SecureStore from 'expo-secure-store';
const key = 'daylight_token';
export const tokenStorage = {
  get: () => SecureStore.getItemAsync(key),
  set: (token) => SecureStore.setItemAsync(key, token),
  remove: () => SecureStore.deleteItemAsync(key),
};
