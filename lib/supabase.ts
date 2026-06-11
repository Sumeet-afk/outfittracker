/**
 * Supabase Client Singleton
 *
 * Centralized Supabase client with AsyncStorage for session persistence.
 * Uses EXPO_PUBLIC_ prefixed env vars for secure key management.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? '';

const supabaseKey = Constants.expoConfig?.extra?.supabaseKey
  ?? process.env.EXPO_PUBLIC_SUPABASE_KEY
  ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase URL or Key is missing. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevent issues in React Native
  },
});
