'use client';

/**
 * Xác thực người dùng.
 *
 * Bản cũ luôn trả về success = true và bỏ qua mật khẩu. Nay việc xác thực
 * được chuyển hẳn sang tầng dữ liệu: khi đã cấu hình Supabase thì dùng
 * Supabase Auth (kiểm tra mật khẩu thật, kiểm tra vai trò); khi chưa cấu hình
 * thì chạy chế độ demo bằng localStorage.
 */

export { signInStudent as loginStudent, signInLecturer as loginLecturer } from '@/lib/data';
export type { AuthResult } from '@/lib/data';
