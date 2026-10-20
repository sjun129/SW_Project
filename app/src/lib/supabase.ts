import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False when .env.local is missing; the app then runs in local demo mode only. */
export const supabaseConfigured = !!url && !!key;

// ponytail: session lives in plain AsyncStorage; switch to the encrypted SecureStore adapter from the Supabase Expo guide before release
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Korean messages for the auth errors users actually hit. */
export function authErrorKo(message: string) {
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/email not confirmed/i.test(message)) return '가입 확인 메일의 링크를 먼저 눌러 주세요.';
  if (/already registered|already been registered/i.test(message)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (/password.*(at least|should be)/i.test(message)) return '비밀번호는 6자 이상이어야 해요.';
  if (/invalid.*email|unable to validate email/i.test(message)) return '이메일 형식을 확인해 주세요.';
  if (/rate limit|too many/i.test(message)) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  return message;
}
