import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { useRemote } from '@/lib/server/backend';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/lecturer/submissions?quiz_id=...&class_id=...
 * Trả về danh sách bài nộp và điểm số của sinh viên cho Giảng viên xem/xuất Excel.
 */
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ giảng viên mới có quyền xem bảng điểm.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quiz_id');
  const classId = searchParams.get('class_id');

  if (!useRemote) {
    const { demoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();

    let scores = [...db.scores];
    if (quizId) {
      scores = scores.filter((s) => s.quiz_id === quizId);
    }

    if (classId) {
      const classEnrollments = db.enrollments.filter((e) => e.class_id === classId);
      const enrolledStudentIds = new Set(classEnrollments.map((e) => e.student_id));
      const enrolledStudentCodes = new Set(
        db.users.filter((u) => enrolledStudentIds.has(u.id)).map((u) => (u.student_code || '').trim().toUpperCase())
      );
      scores = scores.filter((s) => {
        if (enrolledStudentIds.has(s.student_id)) return true;
        const u = db.users.find((x) => x.id === s.student_id);
        const code = (u?.student_code || s.student_id.replace(/^st-/, '')).trim().toUpperCase();
        return enrolledStudentCodes.has(code);
      });
    }

    const result = scores.map((s) => {
      const studentCodeFallback = s.student_id.replace(/^st-/, '').trim().toUpperCase();
      const studentUser = db.users.find((u) => {
        if (u.id === s.student_id) return true;
        const uc = (u.student_code || '').trim().toUpperCase();
        return uc && (uc === studentCodeFallback || s.student_id.includes(uc));
      });
      const studentCode = studentUser?.student_code || studentCodeFallback;
      const quiz = db.quizzes.find((q) => q.id === s.quiz_id);
      return {
        id: `sub-${s.quiz_id}-${s.student_id}`,
        quiz_id: s.quiz_id,
        student_id: s.student_id,
        student_code: studentCode,
        total_score: s.total_score,
        submitted_at: s.submitted_at,
        status: s.status,
        tab_violations_count: s.tab_violations_count || 0,
        student: {
          id: s.student_id,
          student_code: studentCode,
          full_name: studentUser?.full_name || 'Sinh Viên',
          email: studentUser?.email || '',
        },
        quiz: {
          id: s.quiz_id,
          title: quiz?.title || s.quiz_id,
          time_limit_minutes: quiz?.time_limit_minutes || 5,
        },
      };
    }).sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));

    return NextResponse.json({ ok: true, submissions: result });
  }

  try {
    const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    let query = supabase
      .from('submissions')
      .select('*, student:users(*), quiz:quizzes(id, title, time_limit_minutes)')
      .order('submitted_at', { ascending: false });

    if (quizId) query = query.eq('quiz_id', quizId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, submissions: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi tải bảng điểm.' }, { status: 500 });
  }
}
