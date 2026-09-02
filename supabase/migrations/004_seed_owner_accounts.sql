-- ====================================================================
-- MIGRATION 004 — Tài khoản Owner (Giảng viên chủ hệ thống)
--
-- Đăng nhập giảng viên nay xác thực bằng public.users.password_hash
-- (không cần tài khoản Supabase Auth), nên chỉ cần insert thẳng vào
-- bảng users. Chạy sau 002_auth_and_passcode.sql (cần cột password_hash
-- và extension pgcrypto).
--
-- Mật khẩu đặt tạm theo yêu cầu của owner: LeminhPhuc@2512
-- ĐỔI MẬT KHẨU NÀY ngay sau lần đăng nhập đầu tiên bằng:
--   SELECT public.set_lecturer_password('<email>', '<mật khẩu mới>');
-- ====================================================================

INSERT INTO public.users (id, email, student_code, full_name, role, password_hash)
VALUES
  (
    uuid_generate_v4(),
    'phuong.lethanh797@gmail.com',
    NULL,
    'ThS. Lê Thị Thanh Phương',
    'lecturer',
    crypt('LeminhPhuc@2512', gen_salt('bf'))
  ),
  (
    uuid_generate_v4(),
    'letthanhphuong3@dtu.edu.vn',
    NULL,
    'ThS. Lê Thị Thanh Phương',
    'lecturer',
    crypt('LeminhPhuc@2512', gen_salt('bf'))
  )
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role = 'lecturer';
