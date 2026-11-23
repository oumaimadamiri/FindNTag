import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'authToken';

// Un seul endroit à changer pour passer plus tard à expo-secure-store
export const tokenStorage = {
  get: () => AsyncStorage.getItem(KEY),
  set: (token) => AsyncStorage.setItem(KEY, token),
  clear: () => AsyncStorage.removeItem(KEY),
};