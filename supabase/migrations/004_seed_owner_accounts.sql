-- ====================================================================
-- MIGRATION 004 — Khởi tạo tài khoản Giảng viên / Chủ hệ thống (Owner)
--
-- Đăng nhập giảng viên xác thực bằng public.users.password_hash
-- (chạy sau 002_auth_and_passcode.sql).
--
-- HƯỚNG DẪN DÀNH CHO GIẢNG VIÊN:
-- Để tạo tài khoản quản trị của Thầy/Cô trên Supabase thật, Thầy/Cô chỉ cần
-- mở Supabase SQL Editor và chạy lệnh dưới đây với Email và Mật khẩu riêng:
--
-- INSERT INTO public.users (id, email, student_code, full_name, role, password_hash)
-- VALUES (
--   uuid_generate_v4(),
--   '<EMAIL_CỦA_THẦY_CÔ>',
--   NULL,
--   '<HỌ_VÀ_TÊN_GIẢNG_VIÊN>',
--   'lecturer',
--   crypt('<MẬT_KHẨU_TỰ_ĐẶT>', gen_salt('bf'))
-- )
-- ON CONFLICT (email) DO UPDATE
--   SET password_hash = EXCLUDED.password_hash,
--       full_name = EXCLUDED.full_name,
--       role = 'lecturer';
-- ====================================================================

-- Tài khoản Giảng viên mặc định (dùng để kiểm thử, Thầy/Cô nên đổi mật khẩu sau khi cấu hình)
INSERT INTO public.users (id, email, student_code, full_name, role, password_hash)
VALUES
  (
    uuid_generate_v4(),
    'giangvien@edu.vn',
    NULL,
    'TS. Nguyễn Văn A',
    'lecturer',
    crypt('GiangVien@2026', gen_salt('bf'))
  )
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role = 'lecturer';
