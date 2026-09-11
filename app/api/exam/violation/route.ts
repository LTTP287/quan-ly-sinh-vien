import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { recordViolationAdmin, useRemote } from '@/lib/server/backend';
import { demoDb } from '@/lib/server/demoStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/exam/violation { quiz_id, message } -> số lần vi phạm sau khi tăng kèm mốc thời gian */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  const message = String(body?.message || 'Phát hiện chuyển tab hoặc thu nhỏ cửa sổ làm bài!');
  if (!quizId) return NextResponse.json({ error: 'Thiếu mã bài thi.' }, { status: 400 });

  if (!useRemote) {
    const db = demoDb();
    let score = db.scores.find((s) => s.quiz_id === quizId && s.student_id === auth.user.id);
    if (!score) {
      score = {
        quiz_id: quizId,
        student_id: auth.user.id,
        total_score: null,
        submitted_at: null,
        status: 'in_progress',
        tab_violations_count: 0,
        warning_history: [],
      };
      db.scores.push(score);
    }
    score.tab_violations_count = (score.tab_violations_count || 0) + 1;
    if (!score.warning_history) score.warning_history = [];
    score.warning_history.push({
      timestamp: new Date().toISOString(),
      event: 'visibility_hidden',
      message,
    });
    return NextResponse.json({ count: score.tab_violations_count });
  }

  const count = await recordViolationAdmin(quizId, auth.user.id, message);
  return NextResponse.json({ count });
}
