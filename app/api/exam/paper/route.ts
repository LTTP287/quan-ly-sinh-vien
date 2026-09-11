import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { getExamPaperAdmin, useRemote } from '@/lib/server/backend';
import { verifyJwt, examTicketCookie, type ExamTicketPayload } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/exam/paper  { quiz_id }
 *
 * Đổi "vé vào phòng thi" (do /api/quizzes/verify-passcode phát) lấy đề thi.
 * Không có vé hợp lệ thì không lấy được đề, kể cả khi gõ thẳng URL phòng thi.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'student') {
    return NextResponse.json({ error: 'Chỉ sinh viên mới vào được phòng thi.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  if (!quizId) return NextResponse.json({ error: 'Thiếu mã bài thi.' }, { status: 400 });

  const ticketRaw = cookies().get(examTicketCookie(quizId))?.value;
  const ticket = ticketRaw ? await verifyJwt<ExamTicketPayload>(ticketRaw) : null;

  if (!ticket || ticket.sub !== auth.user.id || ticket.quiz !== quizId) {
    return NextResponse.json(
      { error: 'Bạn cần nhập mã phòng thi trước khi vào làm bài.', reason: 'NO_TICKET' },
      { status: 403 }
    );
  }

  // Chế độ demo: phục vụ đề thi trực tiếp từ demoDb (đồng bộ từ Giảng viên)
  if (!useRemote) {
    const { demoDb } = await import('@/lib/server/demoStore');
    const { DEFAULT_QUESTION_BANK } = await import('@/lib/classStore');
    const db = demoDb();
    const quiz = db.quizzes.find((q) => q.id === quizId);

    const existingScore = db.scores.find((s) => s.quiz_id === quizId && s.student_id === auth.user.id);
    if (existingScore?.submitted_at) {
      return NextResponse.json({ error: 'Bạn đã nộp bài thi này rồi.', reason: 'ALREADY_SUBMITTED' }, { status: 409 });
    }

    let questions: any[] = (quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0)
      ? [...quiz.questions]
      : [...DEFAULT_QUESTION_BANK];

    const questionsPerStudent = quiz?.questions_per_student || 5;
    if (questionsPerStudent > 0 && questionsPerStudent < questions.length) {
      let seedVal = 0;
      for (let i = 0; i < auth.user.id.length; i++) seedVal += auth.user.id.charCodeAt(i);
      const shuffled = [...questions].sort((a, b) => {
        const hashA = (a.id.charCodeAt(0) + seedVal) % 17;
        const hashB = (b.id.charCodeAt(0) + seedVal) % 17;
        return hashA - hashB;
      });
      questions = shuffled.slice(0, questionsPerStudent);
    }

    // Ẩn đáp án đúng is_correct để sinh viên không thể F12 gian lận
    const sanitizedQuestions = questions.map((q, idx) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type || 'multiple_choice',
      points: q.points || 1,
      order_index: idx,
      image_url: q.image_url || null,
      options: (q.options || []).map((o: any, oi: number) => ({
        id: o.id,
        option_text: o.option_text,
        order_index: oi,
      })),
    }));

    const paper = {
      submission_id: `sub-${quizId}-${auth.user.id}`,
      quiz: {
        id: quiz?.id || quizId,
        title: quiz?.title || 'Quiz - 05',
        description: quiz?.description || 'Bài kiểm tra trắc nghiệm',
        time_limit_minutes: quiz?.time_limit_minutes || 5,
        prevent_previous: !!quiz?.prevent_previous,
        show_results: !!quiz?.show_results,
      },
      questions: sanitizedQuestions,
      tab_violations_count: existingScore?.tab_violations_count || 0,
    };

    return NextResponse.json({ mode: 'remote', ticket_ok: true, paper });
  }

  try {
    const paper = await getExamPaperAdmin(quizId, auth.user.id);
    return NextResponse.json({ mode: 'remote', ticket_ok: true, paper });
  } catch (err: any) {
    const message = String(err?.message || '');
    const reason = message.includes('ALREADY_SUBMITTED') ? 'ALREADY_SUBMITTED' : 'UNKNOWN';
    return NextResponse.json(
      {
        error:
          reason === 'ALREADY_SUBMITTED'
            ? 'Bạn đã nộp bài thi này rồi.'
            : 'Không mở được phòng thi.',
        reason,
      },
      { status: 409 }
    );
  }
}
