import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { submitExamAdmin, useRemote } from '@/lib/server/backend';
import { examTicketCookie } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/exam/submit { quiz_id, answers, violations, timed_out } */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'student') {
    return NextResponse.json({ error: 'Chi sinh vien moi nop duoc bai.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  if (!quizId) return NextResponse.json({ error: 'Thieu ma bai thi.' }, { status: 400 });

  if (!useRemote) {
    const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();
    const userCode = (auth.user.student_code || '').trim().toUpperCase();

    let score = db.scores.find((s) => {
      if (s.quiz_id !== quizId) return false;
      if (s.student_id === auth.user.id) return true;
      if (userCode && (s.student_id === `st-${userCode}` || s.student_id === userCode)) return true;
      const u = db.users.find((x) => x.id === s.student_id);
      if (userCode && u && (u.student_code || '').trim().toUpperCase() === userCode) return true;
      return false;
    });

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

    // Đảm bảo thông tin sinh viên có trong db.users để giảng viên đối soát tên/MSSV
    const existingUser = db.users.find((u) => u.id === auth.user.id || (userCode && (u.student_code || '').trim().toUpperCase() === userCode));
    if (existingUser) {
      if (auth.user.student_code) existingUser.student_code = auth.user.student_code;
      if (auth.user.full_name) existingUser.full_name = auth.user.full_name;
    } else {
      db.users.push({
        id: auth.user.id,
        student_code: auth.user.student_code,
        full_name: auth.user.full_name || 'Sinh Viên',
        email: auth.user.email || '',
        role: 'student',
      });
    }

    score.status = body?.timed_out ? 'timed_out' : 'submitted';
    score.submitted_at = new Date().toISOString();
    score.tab_violations_count = Math.max(score.tab_violations_count || 0, Number(body?.violations) || 0);
    score.answers = Array.isArray(body?.answers) ? body.answers : [];

    const quiz = db.quizzes.find((q) => q.id === quizId);
    let totalScore = 0;
    let correctCount = 0;
    const { DEFAULT_QUESTION_BANK } = await import('@/lib/classStore');
    const questions = (quiz?.questions && quiz.questions.length > 0) ? quiz.questions : DEFAULT_QUESTION_BANK;

    // Số câu hỏi thực tế trong đề thi của sinh viên
    const totalTestedQuestions = (score.answers && score.answers.length > 0)
      ? score.answers.length
      : (quiz?.questions_per_student || questions.length || 1);

    if (questions.length > 0) {
      for (const a of score.answers || []) {
        const q = questions.find((x: any) => x.id === a.question_id);
        if (q) {
          const opt = (q.options || []).find((o: any) => o.id === a.option_id);
          if (opt && opt.is_correct) {
            correctCount++;
          }
        }
      }
      // Quy đổi chuẩn xác theo thang điểm tối đa là 10
      totalScore = totalTestedQuestions > 0
        ? Math.round((correctCount / totalTestedQuestions) * 10 * 10) / 10
        : 0;
    }
    score.total_score = totalScore;
    saveDemoDb();

    const res = NextResponse.json({
      mode: 'remote',
      result: {
        score: totalScore,
        correct_count: correctCount,
        total_questions: totalTestedQuestions,
        show_results: !!quiz?.show_results,
      },
    });
    res.cookies.set(examTicketCookie(quizId), '', { path: '/', maxAge: 0 });
    return res;
  }

  try {
    const result = await submitExamAdmin(
      quizId,
      auth.user.id,
      Array.isArray(body?.answers) ? body.answers : [],
      Number(body?.violations) || 0,
      !!body?.timed_out
    );
    const res = NextResponse.json({ mode: 'remote', result });
    res.cookies.set(examTicketCookie(quizId), '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || 'Nop bai that bai.') }, { status: 409 });
  }
}
