-- ====================================================================
-- UNIVERSITY QUIZ SYSTEM - DATABASE MIGRATION SCRIPT FOR SUPABASE
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom Types
CREATE TYPE user_role AS ENUM ('lecturer', 'student');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false');
CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'timed_out');

-- 3. Create USERS Profile Table (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    student_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by student_code
CREATE INDEX IF NOT EXISTS idx_users_student_code ON public.users(student_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 4. Create CLASSES Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    semester TEXT NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_code_semester UNIQUE (code, semester)
);

CREATE INDEX IF NOT EXISTS idx_classes_lecturer_id ON public.classes(lecturer_id);

-- 5. Create CLASS_STUDENTS Junction Table
CREATE TABLE IF NOT EXISTS public.class_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);

-- 6. Create QUIZZES Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INT NOT NULL DEFAULT 45,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT false, -- Lecturer manually toggles grade/answer release
    shuffle_questions BOOLEAN NOT NULL DEFAULT true, -- Trộn thứ tự câu hỏi
    shuffle_options BOOLEAN NOT NULL DEFAULT true, -- Trộn thứ tự đáp án lựa chọn
    prevent_previous BOOLEAN NOT NULL DEFAULT true, -- Khóa không cho quay lại câu trước
    questions_per_student INT DEFAULT 5, -- Số câu hỏi rút ngẫu nhiên từ ngân hàng đề cho mỗi SV
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Junction Table: Map 1 Quiz in Test Bank to N Classes with individual per-class schedules & PIN code
CREATE TABLE IF NOT EXISTS public.quiz_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Khung giờ mở thi riêng của lớp
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- Khung giờ đóng thi riêng của lớp
    access_code TEXT,                            -- Mã PIN mở phòng thi tại lớp
    is_active BOOLEAN NOT NULL DEFAULT true,     -- Công tắc chủ động bật/tắt phòng thi
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_quiz_class UNIQUE (quiz_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_classes_quiz ON public.quiz_classes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_classes_class ON public.quiz_classes(class_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_class_id ON public.quizzes(class_id);

-- 7. Create QUESTIONS Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL DEFAULT 'multiple_choice',
    points FLOAT NOT NULL DEFAULT 1.0,
    order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- 8. Create QUESTION_OPTIONS Table
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_options_question_id ON public.question_options(question_id);

-- 9. Create SUBMISSIONS Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    total_score FLOAT,
    status submission_status NOT NULL DEFAULT 'in_progress',
    tab_violations_count INT NOT NULL DEFAULT 0,
    warning_history JSONB DEFAULT '[]'::jsonb,
    CONSTRAINT unique_quiz_student_submission UNIQUE (quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON public.submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);

-- 10. Create SUBMISSION_ANSWERS Table
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_answers ENABLE ROW LEVEL SECURITY;

-- Helper policies for development / demo: Allow read & write to authenticated users
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow all access to classes for lecturers" ON public.classes FOR ALL USING (true);
CREATE POLICY "Allow all access to class_students" ON public.class_students FOR ALL USING (true);

CREATE POLICY "Allow all access to quizzes" ON public.quizzes FOR ALL USING (true);
CREATE POLICY "Allow all access to questions" ON public.questions FOR ALL USING (true);
CREATE POLICY "Allow all access to options" ON public.question_options FOR ALL USING (true);

CREATE POLICY "Allow all access to submissions" ON public.submissions FOR ALL USING (true);
CREATE POLICY "Allow all access to submission answers" ON public.submission_answers FOR ALL USING (true);
