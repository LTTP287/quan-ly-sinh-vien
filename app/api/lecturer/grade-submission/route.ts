import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { useRemote } from '@/lib/server/backend';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/lecturer/grade-submission
 * Body: {
 *   quiz_id: string,
 *   student_id: string,
 *   grades: Array<{ question_id: string, score_awarded: number, feedback?: string }>
 * }
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ giảng viên mới có quyền chấm bài.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  const studentId = String(body?.student_id || '').trim();
  const grades = Array.isArray(body?.grades) ? body.grades : [];

  if (!quizId || !studentId) {
    return NextResponse.json({ error: 'Thiếu mã bài thi (quiz_id) hoặc mã sinh viên (student_id).' }, { status: 400 });
  }

  const gradeMap: Record<string, { score_awarded: number; feedback?: string }> = {};
  for (const g of grades) {
    if (g?.question_id) {
      gradeMap[g.question_id] = {
        score_awarded: Math.max(0, Number(g.score_awarded) || 0),
        feedback: typeof g.feedback === 'string' ? g.feedback.trim() : undefined,
      };
    }
  }

  if (!useRemote) {
    const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();
    const userCode = studentId.replace(/^st-/, '').trim().toUpperCase();

    let score = db.scores.find((s) => {
      if (s.quiz_id !== quizId) return false;
      if (s.student_id === studentId) return true;
      if (userCode) {
        if (s.student_id === `st-${userCode.toLowerCase()}` || s.student_id === `st-${userCode}` || s.student_id === userCode) return true;
        const u = db.users.find((x) => x.id === s.student_id);
        if (u && (u.student_code || '').trim().toUpperCase() === userCode) return true;
      }
      return false;
    });

    if (!score) {
      score = {
        quiz_id: quizId,
        student_id: studentId,
        total_score: 0,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
        tab_violations_count: 0,
        warning_history: [],
        answers: [],
      };
      db.scores.push(score);
    }

    if (!Array.isArray(score.answers)) {
      score.answers = [];
    }

    // Cập nhật điểm và nhận xét cho từng câu hỏi
    const quiz = db.quizzes.find((q) => q.id === quizId);
    const { DEFAULT_QUESTION_BANK, getStoredQuizById, createDefaultMidtermQuiz } = await import('@/lib/classStore');
    const defaultMidterm = createDefaultMidtermQuiz();
    const localQuiz = getStoredQuizById(quizId);
    const isMidterm = quizId === 'midterm-scm-2026' || (quiz?.title && quiz.title.toLowerCase().includes('midterm')) || (localQuiz?.title && localQuiz.title.toLowerCase().includes('midterm'));

    let questions = (quiz?.questions && quiz.questions.length > 0)
      ? [...quiz.questions]
      : ((localQuiz?.questions && localQuiz.questions.length > 0) ? [...localQuiz.questions] : (isMidterm ? [...(defaultMidterm.questions || [])] : DEFAULT_QUESTION_BANK));

    if (isMidterm && questions.length < 30 && defaultMidterm.questions) {
      questions = [...defaultMidterm.questions];
    }

    for (const [qId, gData] of Object.entries(gradeMap)) {
      let ans = score.answers.find((a: any) => a.question_id === qId);
      if (!ans) {
        ans = { question_id: qId };
        score.answers.push(ans);
      }
      ans.score_awarded = gData.score_awarded;
      ans.is_correct = gData.score_awarded > 0;
      if (gData.feedback !== undefined) {
        ans.feedback = gData.feedback;
      }
    }

    // Tính lại tổng điểm
    let totalScore = 0;
    for (const a of score.answers) {
      const q = questions.find((x: any) => x.id === a.question_id) || defaultMidterm.questions?.find((x: any) => x.id === a.question_id);
      if (a.score_awarded !== undefined && a.score_awarded !== null) {
        totalScore += Number(a.score_awarded) || 0;
      } else if (q) {
        if (q.question_type === 'short_answer' || q.question_type === 'long_answer') {
          // Chưa chấm thủ công: để 0đ
          totalScore += 0;
        } else {
          // Trắc nghiệm: kiểm tra đáp án đúng
          const opt = (q.options || []).find((o: any) => o.id === a.option_id);
          if (opt && opt.is_correct) {
            totalScore += Number(q.points) || 0.2;
          }
        }
      }
    }

    // Làm tròn 1 chữ số thập phân, giới hạn tối đa 10
    totalScore = Math.min(10, Math.max(0, Math.round(totalScore * 10) / 10));
    score.total_score = totalScore;
    saveDemoDb();

    // Cập nhật localStorage store nếu có
    try {
      const { saveStoredSubmission, getSubmission } = await import('@/lib/classStore');
      const existingSub = getSubmission(quizId, studentId);
      if (existingSub) {
        existingSub.total_score = totalScore;
        if (existingSub.answers) {
          existingSub.answers = existingSub.answers.map((sa) => {
            const g = gradeMap[sa.question_id];
            if (g) {
              return {
                ...sa,
                score_awarded: g.score_awarded,
                feedback: g.feedback,
              };
            }
            return sa;
          });
        }
        saveStoredSubmission(existingSub);
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      total_score: totalScore,
      message: `Đã lưu điểm chấm thành công (${totalScore}/10 điểm).`,
    });
  }

  // Chế độ Supabase
  try {
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sub, error: subErr } = await admin
      .from('submissions')
      .select('id, total_score')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Không tìm thấy bài nộp của sinh viên.' }, { status: 404 });
    }

    // Cập nhật từng submission_answer
    for (const [qId, gData] of Object.entries(gradeMap)) {
      await admin
        .from('submission_answers')
        .update({
          score_awarded: gData.score_awarded,
          feedback: gData.feedback,
          is_correct: gData.score_awarded > 0,
        })
        .eq('submission_id', sub.id)
        .eq('question_id', qId);
    }

    // Lấy lại toàn bộ câu trả lời để tính tổng điểm
    const { data: allAnswers } = await admin
      .from('submission_answers')
      .select('score_awarded')
      .eq('submission_id', sub.id);

    const calculatedTotal = (allAnswers || []).reduce((acc: number, item: any) => acc + (Number(item.score_awarded) || 0), 0);
    const finalScore = Math.min(10, Math.max(0, Math.round(calculatedTotal * 10) / 10));

    await admin
      .from('submissions')
      .update({ total_score: finalScore })
      .eq('id', sub.id);

    return NextResponse.json({
      ok: true,
      total_score: finalScore,
      message: `Đã cập nhật điểm số thành công (${finalScore}/10 điểm).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi cập nhật điểm bài thi.' }, { status: 500 });
  }
}
