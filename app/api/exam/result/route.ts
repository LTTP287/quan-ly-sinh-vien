import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { getMyResultAdmin, useRemote } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/exam/result?quiz_id=... */
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const quizId = new URL(request.url).searchParams.get('quiz_id');
  if (!quizId) return NextResponse.json({ error: 'Thieu ma bai thi.' }, { status: 400 });

  if (!useRemote) {
    const { demoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();
    const myCode = auth.user.student_code ? auth.user.student_code.trim().toUpperCase() : auth.user.id.replace(/^st-/, '').trim().toUpperCase();
    const score = db.scores.find((s) => {
      if (s.quiz_id !== quizId) return false;
      if (s.student_id === auth.user.id) return true;
      if (myCode) {
        if (s.student_id === `st-${myCode.toLowerCase()}` || s.student_id === `st-${myCode}` || s.student_id === myCode) return true;
        const scUser = db.users.find((x) => x.id === s.student_id);
        if (scUser && (scUser.student_code || '').trim().toUpperCase() === myCode) return true;
      }
      return false;
    });
    if (!score) {
      return NextResponse.json({ mode: 'remote', result: { found: false } });
    }

    const quiz = db.quizzes.find((q) => q.id === quizId);
    const { DEFAULT_QUESTION_BANK } = await import('@/lib/classStore');
    const questions = (quiz?.questions && quiz.questions.length > 0) ? quiz.questions : DEFAULT_QUESTION_BANK;
    const totalTestedQuestions = (score.answers && score.answers.length > 0)
      ? score.answers.length
      : (quiz?.questions_per_student || questions.length || 1);

    let correctCount = 0;
    for (const a of score.answers || []) {
      const q = questions.find((x: any) => x.id === a.question_id);
      if (q) {
        const opt = (q.options || []).find((o: any) => o.id === a.option_id);
        if (opt && opt.is_correct) correctCount++;
      }
    }

    return NextResponse.json({
      mode: 'remote',
      result: {
        found: true,
        show_results: !!quiz?.show_results,
        score: score.total_score,
        correct_count: correctCount,
        total_questions: totalTestedQuestions,
        violations: score.tab_violations_count || 0,
      },
    });
  }

  const result = await getMyResultAdmin(quizId, auth.user.id);
  return NextResponse.json({ mode: 'remote', result });
}
