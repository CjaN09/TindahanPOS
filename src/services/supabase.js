import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe check: reads .env if available, falls back to direct string so the app never crashes
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://wibtnrcelqhqisfqwlei.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYnRucmNlbHFocWlzZnF3bGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NzM3MTAsImV4cCI6MjEwMjQ0OTcxMH0.y1szRnNINAPf8NazN4z8BLsmTzINkGq4LSg8xefNwKg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});