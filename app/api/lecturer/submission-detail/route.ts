import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { useRemote } from '@/lib/server/backend';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/lecturer/submission-detail?quiz_id=...&student_id=...
 * Trả về chi tiết bài làm của sinh viên kèm bằng chứng vi phạm cho Giảng viên.
 */
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ giảng viên mới có quyền xem chi tiết bài làm.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quiz_id');
  const studentId = searchParams.get('student_id');

  if (!quizId || !studentId) {
    return NextResponse.json({ error: 'Thiếu quiz_id hoặc student_id.' }, { status: 400 });
  }

  if (!useRemote) {
    // Chế độ demo
    const { demoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();

    const student = db.users.find((u) => u.id === studentId);
    const quiz = db.quizzes.find((q) => q.id === quizId);
    const score = db.scores.find((s) => s.quiz_id === quizId && s.student_id === studentId);

    // Tìm trong localStorage fallback nếu có
    const { getStoredQuizById, getSubmission, getAllStoredStudents } = await import('@/lib/classStore');
    const localQuiz = getStoredQuizById(quizId);
    const localSub = getSubmission(quizId, studentId);
    const localStudent = getAllStoredStudents().find((s) => s.id === studentId);

    const effectiveStudent = student || localStudent || {
      id: studentId,
      full_name: 'Sinh viên',
      student_code: studentId,
      email: '',
      role: 'student' as const,
    };

    const effectiveQuiz = quiz || localQuiz;
    const allQuestions = (effectiveQuiz?.questions && effectiveQuiz.questions.length > 0)
      ? effectiveQuiz.questions
      : (localQuiz?.questions || []);

    // Map answers
    const answersMap: Record<string, { option_id?: string; answer_text?: string; score_awarded?: number; feedback?: string }> = {};
    if (localSub?.answers) {
      localSub.answers.forEach((a: any) => {
        answersMap[a.question_id] = {
          option_id: a.selected_option_id || undefined,
          answer_text: a.answer_text || undefined,
          score_awarded: a.score_awarded !== undefined ? a.score_awarded : undefined,
          feedback: a.feedback || undefined,
        };
      });
    } else if (score?.answers) {
      score.answers.forEach((a: any) => {
        if (a.question_id) {
          answersMap[a.question_id] = {
            option_id: a.option_id || undefined,
            answer_text: a.answer_text || undefined,
            score_awarded: a.score_awarded !== undefined ? a.score_awarded : undefined,
            feedback: a.feedback || undefined,
          };
        }
      });
    }

    // Nếu sinh viên chỉ được phát một phần câu hỏi (ví dụ 24 câu từ ngân hàng 51 câu), chỉ hiển thị các câu trong bài thi của SV
    const targetQuestions = Object.keys(answersMap).length > 0
      ? allQuestions.filter((q) => q.id in answersMap)
      : allQuestions;

    const detailedQuestions = targetQuestions.map((q) => {
      const selectedOptionId = answersMap[q.id]?.option_id || null;
      const answerText = answersMap[q.id]?.answer_text || null;
      const isCorrect = q.options?.some((o) => o.id === selectedOptionId && o.is_correct) || false;
      const scoreAwarded = answersMap[q.id]?.score_awarded !== undefined ? answersMap[q.id]?.score_awarded : null;
      const feedback = answersMap[q.id]?.feedback || null;

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points || 1,
        selected_option_id: selectedOptionId,
        answer_text: answerText,
        score_awarded: scoreAwarded,
        feedback: feedback,
        is_correct: selectedOptionId ? isCorrect : false,
        options: (q.options || []).map((o) => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          is_selected: o.id === selectedOptionId,
        })),
      };
    });

    return NextResponse.json({
      student: {
        id: effectiveStudent.id,
        full_name: effectiveStudent.full_name,
        student_code: effectiveStudent.student_code,
        email: effectiveStudent.email,
      },
      quiz: {
        id: quizId,
        title: effectiveQuiz?.title || 'Bài kiểm tra',
        time_limit_minutes: effectiveQuiz?.time_limit_minutes || 45,
      },
      submission: {
        id: localSub?.id || `sub-${quizId}-${studentId}`,
        total_score: localSub?.total_score ?? score?.total_score ?? 0,
        status: localSub?.status || score?.status || 'submitted',
        started_at: localSub?.started_at || null,
        submitted_at: localSub?.submitted_at || score?.submitted_at || null,
        tab_violations_count: localSub?.tab_violations_count ?? score?.tab_violations_count ?? 0,
        warning_history: localSub?.warning_history || score?.warning_history || [],
      },
      questions: detailedQuestions,
    });
  }

  // Chế độ Supabase
  try {
    const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sub, error: subErr } = await admin
      .from('submissions')
      .select('*, student:users(*), quiz:quizzes(*)')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Không tìm thấy bài làm của sinh viên này.' }, { status: 404 });
    }

    const { data: subAnswers } = await admin
      .from('submission_answers')
      .select('*, question:questions(*, options:question_options(*))')
      .eq('submission_id', sub.id);

    const detailedQuestions = (subAnswers || []).map((sa: any) => {
      const q = sa.question;
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        selected_option_id: sa.selected_option_id,
        answer_text: sa.answer_text,
        is_correct: sa.is_correct,
        score_awarded: sa.score_awarded,
        options: (q.options || []).map((o: any) => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          is_selected: o.id === sa.selected_option_id,
        })),
      };
    });

    return NextResponse.json({
      student: sub.student,
      quiz: sub.quiz,
      submission: {
        id: sub.id,
        total_score: sub.total_score,
        status: sub.status,
        started_at: sub.started_at,
        submitted_at: sub.submitted_at,
        tab_violations_count: sub.tab_violations_count,
        warning_history: sub.warning_history || [],
      },
      questions: detailedQuestions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi truy xuất bài làm.' }, { status: 500 });
  }
}
