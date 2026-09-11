import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { demoDb, DemoQuiz } from '@/lib/server/demoStore';
import { useRemote } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/quizzes/sync
 * Đồng bộ các đề thi và lịch thi từ localStorage của Giảng viên lên bộ nhớ demoStore của Server.
 * Giúp sinh viên đăng nhập trên thiết bị/trình duyệt khác thấy ngay đề thi đã Publish.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ Giảng viên mới đồng bộ được đề thi.' }, { status: 403 });
  }

  if (useRemote) {
    return NextResponse.json({ ok: true, mode: 'remote' });
  }

  const body = await request.json().catch(() => null);
  const quizzes = Array.isArray(body?.quizzes) ? body.quizzes : [];
  const classes = Array.isArray(body?.classes) ? body.classes : [];

  const db = demoDb();

  // 1. Đồng bộ lớp học phần
  if (classes.length > 0) {
    for (const c of classes) {
      if (!c.id) continue;
      const idx = db.classes.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        db.classes[idx] = { ...db.classes[idx], ...c };
      } else {
        db.classes.push({
          id: c.id,
          code: c.code || 'MH101',
          name: c.name || 'Lớp học phần',
          semester: c.semester || 'HKI (2026 - 2027)',
        });
      }
    }
  }

  // 2. Đồng bộ đề thi
  for (const q of quizzes) {
    if (!q.id) continue;
    const classIds = Array.isArray(q.assigned_class_ids) ? q.assigned_class_ids : [];
    const passcode = q.passcode || q.access_code || '';

    const idx = db.quizzes.findIndex((x) => x.id === q.id);
    const demoQuizItem: DemoQuiz = {
      id: q.id,
      title: q.title || 'Đề thi',
      description: q.description || '',
      time_limit_minutes: Number(q.time_limit_minutes) || 45,
      is_published: q.is_published !== false,
      show_results: !!q.show_results,
      passcode: passcode.trim().toUpperCase() || null,
      passcode_expires_at: q.passcode_expires_at || null,
      class_ids: classIds,
      start_at: q.start_at || new Date(Date.now() - 3600000).toISOString(),
      end_at: q.end_at || new Date(Date.now() + 86400000 * 7).toISOString(),
      is_active: q.is_active !== false,
    };

    if (idx >= 0) {
      db.quizzes[idx] = demoQuizItem;
    } else {
      db.quizzes.push(demoQuizItem);
    }

    // Tự động ghi danh sinh viên vào các lớp được gán đề
    for (const cid of classIds) {
      for (const u of db.users) {
        if (u.role === 'student' && !db.enrollments.some((e) => e.class_id === cid && e.student_id === u.id)) {
          db.enrollments.push({ class_id: cid, student_id: u.id });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, synced_quizzes: quizzes.length });
}
