import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { useRemote } from '@/lib/server/backend';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/lecturer/unlock-submission
 * Body: { quiz_id: string, student_id: string }
 *
 * Giảng viên mở khóa quyền thi lại cho sinh viên (khi bị Kick out hoặc nộp nhầm).
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ giảng viên mới có quyền mở khóa bài thi.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  const studentId = String(body?.student_id || '').trim();

  if (!quizId || !studentId) {
    return NextResponse.json({ error: 'Thiếu mã bài thi (quiz_id) hoặc mã sinh viên (student_id).' }, { status: 400 });
  }

  if (!useRemote) {
    const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();
    const cleanCode = studentId.replace(/^st-/, '').trim().toUpperCase();

    // 1. Tìm và xóa bài nộp trong demoDb.scores
    const beforeCount = db.scores.length;
    db.scores = db.scores.filter((s) => {
      if (s.quiz_id !== quizId) return true;
      if (s.student_id === studentId) return false;
      if (cleanCode) {
        if (s.student_id === `st-${cleanCode.toLowerCase()}` || s.student_id === `st-${cleanCode}` || s.student_id === cleanCode) return false;
        const u = db.users.find((x) => x.id === s.student_id);
        if (u && (u.student_code || '').trim().toUpperCase() === cleanCode) return false;
      }
      return true;
    });

    saveDemoDb();

    // 2. Xóa trong classStore localStorage nếu có
    try {
      const { deleteStoredSubmission } = await import('@/lib/classStore');
      deleteStoredSubmission(quizId, studentId);
    } catch {}

    return NextResponse.json({
      ok: true,
      message: 'Đã mở khóa thành công. Sinh viên có thể vào lại phòng thi để làm bài!',
      removed_count: beforeCount - db.scores.length,
    });
  }

  // Chế độ Supabase
  try {
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Xóa submission của sinh viên để họ được cấp vé mới và làm lại
    const { error } = await admin
      .from('submissions')
      .delete()
      .eq('quiz_id', quizId)
      .eq('student_id', studentId);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: 'Đã mở khóa phòng thi thành công trên hệ thống máy chủ.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi mở khóa bài thi.' }, { status: 500 });
  }
}
