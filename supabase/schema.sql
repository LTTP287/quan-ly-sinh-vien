-- ====================================================================
-- UNIVERSITY QUIZ SYSTEM - DATABASE SCHEMA FOR SUPABASE
-- Chạy toàn bộ file này trong Supabase Studio > SQL Editor.
-- File idempotent: chạy lại nhiều lần không lỗi.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. ENUM TYPES
-- --------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('lecturer', 'student'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'timed_out'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------
-- 2. USERS (hồ sơ, gắn với auth.users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    student_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_student_code ON public.users(student_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Tự tạo hồ sơ public.users mỗi khi có tài khoản auth mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.users (id, email, student_code, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'student_code', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 3. CLASSES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    semester TEXT NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_class_name_semester UNIQUE (name, semester)
);

CREATE INDEX IF NOT EXISTS idx_classes_lecturer_id ON public.classes(lecturer_id);

CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);

-- --------------------------------------------------------------------
-- 4. QUIZZES + phân công cho từng lớp (khung giờ & mã PIN riêng)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INT NOT NULL DEFAULT 45,
    start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    is_published BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT false,
    shuffle_questions BOOLEAN NOT NULL DEFAULT true,
    shuffle_options BOOLEAN NOT NULL DEFAULT true,
    prevent_previous BOOLEAN NOT NULL DEFAULT true,
    questions_per_student INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON public.quizzes(owner_id);
-- Lưu ý: KHÔNG tạo index trên quizzes(class_id) — cột đó không tồn tại.
-- Việc phân công lớp nằm ở bảng quiz_classes bên dưới.
-- (Bản schema cũ có dòng CREATE INDEX ... quizzes(class_id) làm script chạy lỗi.)

CREATE TABLE IF NOT EXISTS public.quiz_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    access_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_quiz_class UNIQUE (quiz_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_classes_quiz ON public.quiz_classes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_classes_class ON public.quiz_classes(class_id);

-- --------------------------------------------------------------------
-- 5. QUESTIONS + OPTIONS (đáp án đúng KHÔNG BAO GIỜ lộ ra client)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL DEFAULT 'multiple_choice',
    points FLOAT NOT NULL DEFAULT 1.0,
    order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_options_question_id ON public.question_options(question_id);

-- --------------------------------------------------------------------
-- 6. SUBMISSIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    paper_seed TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    submitted_at TIMESTAMPTZ,
    total_score FLOAT,
    status submission_status NOT NULL DEFAULT 'in_progress',
    tab_violations_count INT NOT NULL DEFAULT 0,
    warning_history JSONB DEFAULT '[]'::jsonb,
    CONSTRAINT unique_quiz_student_submission UNIQUE (quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON public.submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);

CREATE TABLE IF NOT EXISTS public.submission_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    answer_text TEXT,
    is_correct BOOLEAN,
    score_awarded FLOAT DEFAULT 0.0,
    CONSTRAINT unique_submission_question UNIQUE (submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_answers_submission_id ON public.submission_answers(submission_id);

-- ====================================================================
-- HELPER FUNCTIONS (dùng trong RLS — SECURITY DEFINER để tránh đệ quy RLS)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_lecturer()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'lecturer');
$fn$;

CREATE OR REPLACE FUNCTION public.owns_class(p_class_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = p_class_id AND lecturer_id = auth.uid());
$fn$;

CREATE OR REPLACE FUNCTION public.owns_quiz(p_quiz_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.quizzes WHERE id = p_quiz_id AND owner_id = auth.uid());
$fn$;

CREATE OR REPLACE FUNCTION public.is_enrolled(p_class_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.class_students WHERE class_id = p_class_id AND student_id = auth.uid());
$fn$;

-- Sinh viên có được giao bài quiz này không?
CREATE OR REPLACE FUNCTION public.quiz_assigned_to_me(p_quiz_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_classes qc
    JOIN public.class_students cs ON cs.class_id = qc.class_id
    WHERE qc.quiz_id = p_quiz_id AND cs.student_id = auth.uid()
  );
$fn$;

-- ====================================================================
-- ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_answers ENABLE ROW LEVEL SECURITY;

-- Xóa mọi policy cũ (bản demo dùng USING (true) = tắt bảo mật)
DO $blk$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','classes','class_students','quizzes','quiz_classes',
                        'questions','question_options','submissions','submission_answers')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $blk$;

-- USERS: xem hồ sơ của chính mình; giảng viên xem được danh sách sinh viên
CREATE POLICY users_select ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_lecturer());
CREATE POLICY users_update_self ON public.users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY users_insert_lecturer ON public.users FOR INSERT
  WITH CHECK (public.is_lecturer());

-- CLASSES: giảng viên toàn quyền trên lớp mình; sinh viên chỉ đọc lớp đã ghi danh
CREATE POLICY classes_select ON public.classes FOR SELECT
  USING (lecturer_id = auth.uid() OR public.is_enrolled(id));
CREATE POLICY classes_insert ON public.classes FOR INSERT
  WITH CHECK (public.is_lecturer() AND lecturer_id = auth.uid());
CREATE POLICY classes_update ON public.classes FOR UPDATE
  USING (lecturer_id = auth.uid()) WITH CHECK (lecturer_id = auth.uid());
CREATE POLICY classes_delete ON public.classes FOR DELETE
  USING (lecturer_id = auth.uid());

-- CLASS_STUDENTS
CREATE POLICY class_students_select ON public.class_students FOR SELECT
  USING (student_id = auth.uid() OR public.owns_class(class_id));
CREATE POLICY class_students_insert ON public.class_students FOR INSERT
  WITH CHECK (public.owns_class(class_id));
CREATE POLICY class_students_delete ON public.class_students FOR DELETE
  USING (public.owns_class(class_id));

-- QUIZZES: chủ đề thi toàn quyền; sinh viên chỉ đọc đề đã publish & được giao
CREATE POLICY quizzes_select ON public.quizzes FOR SELECT
  USING (owner_id = auth.uid() OR (is_published AND public.quiz_assigned_to_me(id)));
CREATE POLICY quizzes_insert ON public.quizzes FOR INSERT
  WITH CHECK (public.is_lecturer() AND owner_id = auth.uid());
CREATE POLICY quizzes_update ON public.quizzes FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY quizzes_delete ON public.quizzes FOR DELETE
  USING (owner_id = auth.uid());

-- QUIZ_CLASSES: sinh viên đọc được lịch thi lớp mình.
-- Mã PIN không bao giờ được so sánh ở client — xem RPC verify_exam_access().
CREATE POLICY quiz_classes_select ON public.quiz_classes FOR SELECT
  USING (public.owns_quiz(quiz_id) OR public.is_enrolled(class_id));
CREATE POLICY quiz_classes_insert ON public.quiz_classes FOR INSERT
  WITH CHECK (public.owns_quiz(quiz_id));
CREATE POLICY quiz_classes_update ON public.quiz_classes FOR UPDATE
  USING (public.owns_quiz(quiz_id)) WITH CHECK (public.owns_quiz(quiz_id));
CREATE POLICY quiz_classes_delete ON public.quiz_classes FOR DELETE
  USING (public.owns_quiz(quiz_id));

-- QUESTIONS: CHỈ giảng viên sở hữu đề mới đọc trực tiếp được.
-- Sinh viên lấy đề qua RPC get_exam_paper() (đã lọc bỏ cột is_correct).
CREATE POLICY questions_owner_all ON public.questions FOR ALL
  USING (public.owns_quiz(quiz_id)) WITH CHECK (public.owns_quiz(quiz_id));

-- QUESTION_OPTIONS: tuyệt đối không cho sinh viên đọc is_correct
CREATE POLICY options_owner_all ON public.question_options FOR ALL
  USING (EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND public.owns_quiz(q.quiz_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND public.owns_quiz(q.quiz_id)));

-- SUBMISSIONS: chỉ ĐỌC. Việc ghi điểm chỉ diễn ra trong RPC submit_exam()
-- (SECURITY DEFINER) nên client không thể tự ghi hay sửa điểm của mình.
CREATE POLICY submissions_select ON public.submissions FOR SELECT
  USING (student_id = auth.uid() OR public.owns_quiz(quiz_id));

CREATE POLICY submission_answers_select ON public.submission_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = submission_id AND (s.student_id = auth.uid() OR public.owns_quiz(s.quiz_id))
  ));
