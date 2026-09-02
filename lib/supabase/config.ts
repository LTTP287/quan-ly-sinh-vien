export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Ứng dụng chạy ở 2 chế độ:
 *  - "remote": có đủ biến môi trường Supabase -> dùng CSDL thật, auth thật, RLS thật.
 *  - "demo":   chưa cấu hình -> dùng localStorage như bản prototype (không có bảo mật).
 *
 * Kiểm tra ở đây một chỗ duy nhất để mọi tầng khác dùng chung.
 */
export const isSupabaseConfigured: boolean =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('placeholder') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('placeholder');
