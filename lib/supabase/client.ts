import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Trả về Supabase client dùng ở phía trình duyệt, hoặc null khi app đang
 * chạy ở chế độ demo (chưa cấu hình .env.local).
 */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}
