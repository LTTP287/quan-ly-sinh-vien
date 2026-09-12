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
function createPRNG(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(array: T[], randomFn: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

    const myCode = auth.user.student_code ? auth.user.student_code.trim().toUpperCase() : '';
    const existingScore = db.scores.find((s) => {
      if (s.quiz_id !== quizId || !s.submitted_at) return false;
      if (s.student_id === auth.user.id) return true;
      if (myCode) {
        const scUser = db.users.find((x) => x.id === s.student_id);
        if (scUser && (scUser.student_code || '').trim().toUpperCase() === myCode) {
          return true;
        }
      }
      return false;
    });
    if (existingScore?.submitted_at) {
      return NextResponse.json({ error: 'Bạn đã nộp bài thi này rồi và không thể làm lại.', reason: 'ALREADY_SUBMITTED' }, { status: 409 });
    }

    const userCode = auth.user.student_code ? auth.user.student_code.trim().toUpperCase() : auth.user.id;
    const seed = `${userCode}_${quizId}`;
    const rng = createPRNG(seed);

    let questions: any[] = (quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0)
      ? [...quiz.questions]
      : [...DEFAULT_QUESTION_BANK];

    const questionsPerStudent = quiz?.questions_per_student || 5;
    const sampling = quiz?.section_sampling;

    // Rút ngẫu nhiên theo từng phần (section_sampling) nếu có cấu hình:
    // Ví dụ: phần 1 rút 20 câu, phần 2 rút 3 câu, phần 3 rút 1 câu
    if (sampling && (typeof sampling.multiple_choice === 'number' || typeof sampling.short_answer === 'number' || typeof sampling.long_answer === 'number')) {
      let mcPool = questions.filter((q) => q.question_type === 'multiple_choice' || q.question_type === 'true_false');
      let shortPool = questions.filter((q) => q.question_type === 'short_answer');
      let longPool = questions.filter((q) => q.question_type === 'long_answer');

      if (quiz?.shuffle_questions !== false) {
        mcPool = shuffleArray(mcPool, rng);
        shortPool = shuffleArray(shortPool, rng);
        longPool = shuffleArray(longPool, rng);
      }

      const mcTake = Math.min(mcPool.length, Math.max(0, sampling.multiple_choice ?? mcPool.length));
      const shortTake = Math.min(shortPool.length, Math.max(0, sampling.short_answer ?? shortPool.length));
      const longTake = Math.min(longPool.length, Math.max(0, sampling.long_answer ?? longPool.length));

      questions = [
        ...mcPool.slice(0, mcTake),
        ...shortPool.slice(0, shortTake),
        ...longPool.slice(0, longTake),
      ];
    } else {
      // Xáo trộn thứ tự các câu hỏi trong bộ câu hỏi
      if (quiz?.shuffle_questions !== false) {
        questions = shuffleArray(questions, rng);
      }

      // Rút ngẫu nhiên số câu hỏi phân bổ cho sinh viên nếu có cấu hình
      if (questionsPerStudent > 0 && questionsPerStudent < questions.length) {
        questions = questions.slice(0, questionsPerStudent);
      }
    }

    // Ẩn đáp án đúng is_correct để sinh viên không thể F12 gian lận
    // Mỗi câu được chia đều điểm chuẩn xác theo thang điểm tối đa là 10 (ví dụ 5 câu = 2đ/câu)
    const pointsPerQ = questions.length > 0 ? Math.round((10 / questions.length) * 100) / 100 : 1;

    const sanitizedQuestions = questions.map((q, idx) => {
      let rawOptions = Array.isArray(q.options) ? [...q.options] : [];
      // Xáo trộn các đáp án A, B, C, D của từng câu hỏi
      if (quiz?.shuffle_options !== false) {
        rawOptions = shuffleArray(rawOptions, rng);
      }

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        points: typeof q.points === 'number' && q.points > 0 ? q.points : pointsPerQ,
        order_index: idx,
        image_url: q.image_url || null,
        options: rawOptions.map((o: any, oi: number) => ({
          id: o.id,
          option_text: o.option_text,
          order_index: oi,
        })),
      };
    });

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
