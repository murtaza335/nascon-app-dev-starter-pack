import { Platform } from 'react-native';

// Web development uses the Expo proxy; native devices need a reachable host URL.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? '/api' : null);
