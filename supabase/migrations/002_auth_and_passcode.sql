-- ====================================================================
-- MIGRATION 002 — Luồng xác thực mới & mã phòng thi
--
-- Chạy file này SAU schema.sql và functions.sql.
-- Nội dung:
--   1. users.date_of_birth            -> mật khẩu sinh viên (DDMMYYYY)
--   2. users.password_hash            -> mật khẩu giảng viên (bcrypt qua pgcrypto)
--   3. quizzes.passcode / passcode_expires_at -> mã phòng thi cấp tại lớp
--   4. bảng sessions                  -> quản lý token, khoá 1 phiên / 1 MSSV
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1 & 2. USERS
-- --------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.users.date_of_birth IS
  'Ngày sinh. Sinh viên đăng nhập bằng MSSV + ngày sinh dạng DDMMYYYY.';
COMMENT ON COLUMN public.users.password_hash IS
  'Chỉ dùng cho giảng viên. Băm bằng crypt(..., gen_salt(''bf'')).';

-- --------------------------------------------------------------------
-- 3. QUIZZES — mã phòng thi + hạn hiệu lực
-- --------------------------------------------------------------------
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS passcode TEXT;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS passcode_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quizzes.passcode IS
  'Mã phòng thi giảng viên đọc tại lớp. KHÔNG BAO GIỜ gửi xuống client.';
COMMENT ON COLUMN public.quizzes.passcode_expires_at IS
  'Thời điểm mã phòng thi hết hiệu lực.';

-- Sinh viên tuyệt đối không được đọc 2 cột này. RLS theo hàng không lọc được
-- cột, nên tạo view chỉ chứa các cột an toàn và thu hồi quyền đọc bảng gốc.
CREATE OR REPLACE VIEW public.quizzes_public
WITH (security_invoker = true) AS
  SELECT id, owner_id, title, description, time_limit_minutes, start_at, end_at,
         is_published, show_results, shuffle_questions, shuffle_options,
         prevent_previous, questions_per_student, created_at,
         (passcode IS NOT NULL AND length(trim(passcode)) > 0) AS requires_passcode,
         passcode_expires_at
  FROM public.quizzes;

GRANT SELECT ON public.quizzes_public TO authenticated;

-- --------------------------------------------------------------------
-- 4. SESSIONS — mỗi user chỉ giữ 1 phiên hoạt động
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,   -- SHA-256 của JWT, không lưu token gốc
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    user_agent TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token_hash);

-- Chỉ cho phép TỐI ĐA 1 phiên còn sống trên mỗi user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_session_per_user
  ON public.sessions(user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- Không tạo policy nào: chỉ service-role (API server) đụng được bảng này.

-- --------------------------------------------------------------------
-- RPC: đăng nhập
-- Trả về hồ sơ nếu mật khẩu đúng, ngược lại trả rỗng.
-- Đặt SECURITY DEFINER để client không cần quyền đọc date_of_birth/password_hash.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_student(p_student_code TEXT, p_dob TEXT)
RETURNS TABLE (id UUID, email TEXT, student_code TEXT, full_name TEXT, role user_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT u.id, u.email, u.student_code, u.full_name, u.role
  FROM public.users u
  WHERE u.role = 'student'
    AND upper(trim(u.student_code)) = upper(trim(p_student_code))
    AND u.date_of_birth IS NOT NULL
    -- Mật khẩu là ngày sinh dạng DDMMYYYY
    AND to_char(u.date_of_birth, 'DDMMYYYY') = regexp_replace(coalesce(p_dob, ''), '\D', '', 'g');
$fn$;

CREATE OR REPLACE FUNCTION public.authenticate_lecturer(p_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, email TEXT, student_code TEXT, full_name TEXT, role user_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT u.id, u.email, u.student_code, u.full_name, u.role
  FROM public.users u
  WHERE u.role = 'lecturer'
    AND lower(trim(u.email)) = lower(trim(p_email))
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(coalesce(p_password, ''), u.password_hash);
$fn$;

REVOKE ALL ON FUNCTION public.authenticate_student(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.authenticate_lecturer(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
-- Chỉ service-role (API /api/auth/login) được gọi.

-- --------------------------------------------------------------------
-- RPC: đối chiếu mã phòng thi (KHÔNG trả mã ra ngoài)
-- Trả về jsonb { ok, reason, quiz_id, time_limit_minutes }
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_quiz_passcode(
  p_quiz_id UUID,
  p_student_id UUID,
  p_passcode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_quiz RECORD;
  v_qc   RECORD;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  IF NOT v_quiz.is_published THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_PUBLISHED');
  END IF;

  -- Sinh viên phải thuộc một lớp được giao bài thi này
  SELECT qc.* INTO v_qc
  FROM public.quiz_classes qc
  JOIN public.class_students cs ON cs.class_id = qc.class_id
  WHERE qc.quiz_id = p_quiz_id AND cs.student_id = p_student_id
  ORDER BY qc.start_at
  LIMIT 1;

  IF v_qc IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ASSIGNED');
  END IF;

  IF NOT v_qc.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ROOM_CLOSED');
  END IF;

  IF now() < v_qc.start_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_STARTED');
  END IF;

  IF now() > v_qc.end_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ENDED');
  END IF;

  -- Mã phòng thi còn hiệu lực?
  IF v_quiz.passcode_expires_at IS NOT NULL AND now() > v_quiz.passcode_expires_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'PASSCODE_EXPIRED');
  END IF;

  -- Ưu tiên mã cấp theo đề, không có thì dùng mã riêng của lớp
  IF v_quiz.passcode IS NOT NULL AND length(trim(v_quiz.passcode)) > 0 THEN
    IF upper(trim(coalesce(p_passcode, ''))) <> upper(trim(v_quiz.passcode)) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'WRONG_PASSCODE');
    END IF;
  ELSIF v_qc.access_code IS NOT NULL AND length(trim(v_qc.access_code)) > 0 THEN
    IF upper(trim(coalesce(p_passcode, ''))) <> upper(trim(v_qc.access_code)) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'WRONG_PASSCODE');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'quiz_id', v_quiz.id,
    'time_limit_minutes', v_quiz.time_limit_minutes
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.check_quiz_passcode(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- Tiện ích cho giảng viên: đặt mật khẩu & đặt ngày sinh sinh viên
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_lecturer_password(p_email TEXT, p_password TEXT)
RETURNS VOID
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
  UPDATE public.users
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE lower(trim(email)) = lower(trim(p_email)) AND role = 'lecturer';
$fn$;

REVOKE ALL ON FUNCTION public.set_lecturer_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
