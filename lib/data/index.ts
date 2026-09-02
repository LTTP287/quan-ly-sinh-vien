'use client';

/**
 * TẦNG DỮ LIỆU DÙNG CHUNG
 *
 * Mọi trang gọi qua đây thay vì gọi thẳng localStorage. Bên trong tự chọn:
 *   - remote: Supabase (auth thật, RLS thật, chấm điểm trên server)
 *   - demo:   localStorage (bản prototype cũ, không có bảo mật)
 */

import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  ClassModule,
  ClassQuizSchedule,
  Question,
  Quiz,
  Submission,
  UserProfile,
} from '@/types/database';
import * as local from '@/lib/classStore';
import { gradeSubmission } from '@/lib/grading';

export const isRemote = isSupabaseConfigured;

/** Email nội bộ sinh ra từ MSSV để đăng nhập bằng Supabase Auth. */
export const STUDENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'student.university.edu.vn';

export function studentCodeToEmail(code: string): string {
  return `${code.trim().toUpperCase()}@${STUDENT_EMAIL_DOMAIN}`.toLowerCase();
}

function db() {
  const client = createClient();
  if (!client) throw new Error('Supabase chưa được cấu hình');
  return client;
}

// ====================================================================
// AUTH
// ====================================================================

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  redirect?: string;
}

/**
 * Đăng nhập sinh viên: MSSV + Ngày sinh (DDMMYYYY).
 * Xác thực do /api/auth/login làm trên server, trả JWT trong cookie httpOnly.
 */
export async function signInStudent(studentCode: string, dateOfBirth: string): Promise<AuthResult> {
  return postLogin({
    role: 'student',
    student_code: studentCode.trim(),
    date_of_birth: (dateOfBirth || '').replace(/\D/g, ''),
  });
}

/** Đăng nhập giảng viên: email + mật khẩu. */
export async function signInLecturer(email: string, password: string): Promise<AuthResult> {
  return postLogin({ role: 'lecturer', email: email.trim(), password });
}

async function postLogin(body: Record<string, unknown>): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) return { success: false, error: json.error || 'Đăng nhập thất bại.' };

    // Lưu bản sao hồ sơ để UI đọc nhanh; nguồn sự thật vẫn là cookie phiên.
    if (typeof window !== 'undefined' && json.user) {
      localStorage.setItem('user_session', JSON.stringify(json.user));
    }
    return { success: true, user: json.user as UserProfile, redirect: json.redirect };
  } catch {
    return { success: false, error: 'Không kết nối được máy chủ.' };
  }
}

/**
 * Người dùng của phiên hiện tại. Gọi /api/auth/me nên nếu phiên đã bị
 * đăng nhập ở nơi khác chiếm chỗ (Single Session Lock) thì trả về null.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) {
      if (typeof window !== 'undefined') localStorage.removeItem('user_session');
      return null;
    }
    const json = await res.json();
    if (typeof window !== 'undefined' && json.user) {
      localStorage.setItem('user_session', JSON.stringify(json.user));
    }
    return json.user as UserProfile;
  } catch {
    return null;
  }
}

/** Hồ sơ đã cache trong localStorage — dùng để render ngay, không xác thực. */
export function getCachedUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* bỏ qua */
  }
  if (typeof window !== 'undefined') localStorage.removeItem('user_session');
  if (isRemote) {
    const client = createClient();
    if (client) await client.auth.signOut();
  }
}

// ====================================================================
// CLASSES & STUDENTS
// ====================================================================

export async function listClasses(): Promise<ClassModule[]> {
  if (!isRemote) {
    return local.getStoredClasses().map((c) => ({
      ...c,
      students_count: local.getStoredStudents(c.id).length,
    }));
  }

  const supabase = db();
  const { data, error } = await supabase
    .from('classes')
    .select('*, class_students(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    semester: row.semester,
    lecturer_id: row.lecturer_id,
    created_at: row.created_at,
    students_count: row.class_students?.[0]?.count ?? 0,
  }));
}

export async function getClass(classId: string): Promise<ClassModule | null> {
  if (!isRemote) return local.getStoredClassById(classId) || null;

  const { data, error } = await db().from('classes').select('*').eq('id', classId).single();
  if (error) return null;
  return data as ClassModule;
}

export async function createClass(input: {
  code: string;
  name: string;
  semester: string;
}): Promise<ClassModule[]> {
  if (!isRemote) {
    const user = await getCurrentUser();
    return local.addStoredClass({
      id: `class-${Date.now()}`,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      semester: input.semester,
      lecturer_id: user?.id || 'lecturer-uuid-1',
      created_at: new Date().toISOString(),
      students_count: 0,
    });
  }

  const user = await getCurrentUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const { error } = await db()
    .from('classes')
    .insert({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      semester: input.semester,
      lecturer_id: user.id,
    });
  if (error) throw error;

  return listClasses();
}

export async function listStudents(classId: string): Promise<UserProfile[]> {
  if (!isRemote) return local.getStoredStudents(classId);

  const { data, error } = await db()
    .from('class_students')
    .select('student:users(*)')
    .eq('class_id', classId);
  if (error) throw error;

  return (data || [])
    .map((r: any) => r.student)
    .filter(Boolean)
    .sort((a: UserProfile, b: UserProfile) =>
      (a.student_code || '').localeCompare(b.student_code || '')
    );
}

export interface ImportStudentInput {
  student_code: string;
  full_name: string;
  email?: string;
  date_of_birth?: string; // yyyy-mm-dd — trở thành mật khẩu đăng nhập (DDMMYYYY)
}

export interface ImportResult {
  created: number;
  enrolled: number;
  skipped: number;
  errors: string[];
}

/**
 * Import danh sách sinh viên từ Excel.
 * Ở chế độ remote việc tạo tài khoản cần service-role key nên phải đi qua
 * Route Handler /api/students/import chạy trên server.
 */
export async function importStudents(
  classId: string,
  students: ImportStudentInput[]
): Promise<ImportResult> {
  if (!isRemote) {
    const merged = local.saveStoredStudents(
      classId,
      students.map((s, i) => ({
        id: `st-${Date.now()}-${i}`,
        student_code: s.student_code,
        full_name: s.full_name,
        email: s.email || studentCodeToEmail(s.student_code),
        role: 'student' as const,
        date_of_birth: s.date_of_birth || null,
        created_at: new Date().toISOString(),
      }))
    );
    return { created: students.length, enrolled: merged.length, skipped: 0, errors: [] };
  }

  const res = await fetch('/api/students/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId, students }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Import thất bại');
  return json as ImportResult;
}

export async function removeStudent(classId: string, studentId: string): Promise<UserProfile[]> {
  if (!isRemote) return local.deleteStoredStudent(classId, studentId);

  const { error } = await db()
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId);
  if (error) throw error;

  return listStudents(classId);
}

// ====================================================================
// QUIZZES
// ====================================================================

function mapQuizRow(row: any): Quiz {
  const assignments = row.quiz_classes || [];
  const schedules: Record<string, ClassQuizSchedule> = {};
  assignments.forEach((a: any) => {
    schedules[a.class_id] = {
      class_id: a.class_id,
      start_at: a.start_at,
      end_at: a.end_at,
      // access_code KHÔNG được đưa xuống client ở chế độ remote
      access_code: null,
      is_active: a.is_active,
    };
  });

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    time_limit_minutes: row.time_limit_minutes,
    start_at: row.start_at,
    end_at: row.end_at,
    is_published: row.is_published,
    show_results: row.show_results,
    shuffle_questions: row.shuffle_questions,
    shuffle_options: row.shuffle_options,
    prevent_previous: row.prevent_previous,
    questions_per_student: row.questions_per_student,
    created_at: row.created_at,
    assigned_class_ids: assignments.map((a: any) => a.class_id),
    class_schedules: schedules,
    assigned_classes_count: assignments.length,
    questions_count: row.questions?.[0]?.count ?? 0,
  };
}

export async function listQuizzes(): Promise<Quiz[]> {
  if (!isRemote) return local.getStoredQuizzes();

  const { data, error } = await db()
    .from('quizzes')
    .select('*, quiz_classes(*), questions(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(mapQuizRow);
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  if (!isRemote) return local.getStoredQuizById(quizId) || null;

  const { data, error } = await db()
    .from('quizzes')
    .select('*, quiz_classes(*), questions(count)')
    .eq('id', quizId)
    .single();
  if (error) return null;
  return mapQuizRow(data);
}

export interface QuizAssignmentInput {
  class_id: string;
  start_at: string;
  end_at: string;
  access_code?: string | null;
}

export async function createQuiz(
  quiz: Omit<Quiz, 'id' | 'created_at'>,
  questions: Question[],
  assignments: QuizAssignmentInput[]
): Promise<string> {
  if (!isRemote) {
    const id = `quiz-tb-${Date.now()}`;
    const schedules: Record<string, ClassQuizSchedule> = {};
    assignments.forEach((a) => {
      schedules[a.class_id] = {
        class_id: a.class_id,
        start_at: a.start_at,
        end_at: a.end_at,
        access_code: a.access_code || null,
        is_active: true,
      };
    });

    local.saveStoredQuiz({
      ...quiz,
      id,
      created_at: new Date().toISOString(),
      questions,
      questions_count: questions.length,
      assigned_class_ids: assignments.map((a) => a.class_id),
      assigned_classes_count: assignments.length,
      class_schedules: schedules,
    });
    return id;
  }

  const supabase = db();
  const user = await getCurrentUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const { data: created, error: quizErr } = await supabase
    .from('quizzes')
    .insert({
      owner_id: user.id,
      title: quiz.title,
      description: quiz.description,
      time_limit_minutes: quiz.time_limit_minutes,
      start_at: quiz.start_at,
      end_at: quiz.end_at,
      is_published: quiz.is_published,
      show_results: quiz.show_results,
      shuffle_questions: quiz.shuffle_questions,
      shuffle_options: quiz.shuffle_options,
      prevent_previous: quiz.prevent_previous,
      questions_per_student: quiz.questions_per_student,
      passcode: quiz.passcode || null,
      passcode_expires_at: quiz.passcode_expires_at || null,
    })
    .select('id')
    .single();
  if (quizErr) throw quizErr;

  const quizId = created.id as string;

  for (const q of questions) {
    const { data: qRow, error: qErr } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
      })
      .select('id')
      .single();
    if (qErr) throw qErr;

    const options = (q.options || []).map((o, idx) => ({
      question_id: qRow.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      order_index: idx,
    }));
    if (options.length > 0) {
      const { error: oErr } = await supabase.from('question_options').insert(options);
      if (oErr) throw oErr;
    }
  }

  if (assignments.length > 0) {
    const { error: aErr } = await supabase.from('quiz_classes').insert(
      assignments.map((a) => ({
        quiz_id: quizId,
        class_id: a.class_id,
        start_at: a.start_at,
        end_at: a.end_at,
        access_code: a.access_code || null,
        is_active: true,
      }))
    );
    if (aErr) throw aErr;
  }

  return quizId;
}

export async function setShowResults(quizId: string, value: boolean): Promise<void> {
  if (!isRemote) {
    const quiz = local.getStoredQuizById(quizId);
    if (quiz) local.saveStoredQuiz({ ...quiz, show_results: value });
    return;
  }

  const { error } = await db().from('quizzes').update({ show_results: value }).eq('id', quizId);
  if (error) throw error;
}


/**
 * Lưu toàn bộ phân công lớp + khung giờ + mã PIN của một đề thi.
 * `schedules` là trạng thái MONG MUỐN: lớp nào không có trong đó sẽ bị gỡ.
 */
export async function saveQuizSchedules(
  quizId: string,
  schedules: Record<string, ClassQuizSchedule>
): Promise<Quiz[]> {
  const classIds = Object.keys(schedules);

  if (!isRemote) {
    const quiz = local.getStoredQuizById(quizId);
    if (!quiz) return local.getStoredQuizzes();
    return local.saveStoredQuiz({
      ...quiz,
      class_schedules: schedules,
      assigned_class_ids: classIds,
      assigned_classes_count: classIds.length,
    });
  }

  const supabase = db();

  // Gỡ những lớp không còn được gán
  const del = supabase.from('quiz_classes').delete().eq('quiz_id', quizId);
  const { error: delErr } =
    classIds.length > 0 ? await del.not('class_id', 'in', `(${classIds.join(',')})`) : await del;
  if (delErr) throw delErr;

  if (classIds.length > 0) {
    const rows = classIds.map((classId) => {
      const sc = schedules[classId];
      return {
        quiz_id: quizId,
        class_id: classId,
        start_at: new Date(sc.start_at).toISOString(),
        end_at: new Date(sc.end_at).toISOString(),
        access_code: sc.access_code || null,
        is_active: sc.is_active,
      };
    });
    const { error } = await supabase.from('quiz_classes').upsert(rows, { onConflict: 'quiz_id,class_id' });
    if (error) throw error;
  }

  return listQuizzes();
}

// ====================================================================
// SUBMISSIONS (phía Giảng viên)
// ====================================================================

export async function listSubmissions(quizId: string): Promise<Submission[]> {
  if (!isRemote) {
    return local
      .getSubmissionsByQuiz(quizId)
      .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
  }

  const { data, error } = await db()
    .from('submissions')
    .select('*, student:users(*)')
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Submission[];
}

// ====================================================================
// PHÒNG THI (phía Sinh viên)
//
// Luồng thi nay đi qua các API route trên server (/api/exam/*,
// /api/quizzes/verify-passcode) chứ không gọi thẳng Supabase RPC từ
// client nữa — vì xác thực dùng JWT/session riêng (Single Session Lock),
// không còn dùng Supabase Auth cho phiên đăng nhập. Xem app/api/exam/*.

/** Lưu bài nộp vào Test Bank cục bộ (chỉ dùng ở chế độ demo). */
export function saveSubmissionLocal(submission: Submission): void {
  local.saveStoredSubmission(submission);
}
