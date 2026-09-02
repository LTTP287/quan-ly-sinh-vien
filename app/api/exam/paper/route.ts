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

  // Chế độ demo: đề nằm ở localStorage trên trình duyệt, client tự dựng đề.
  if (!useRemote) {
    return NextResponse.json({ mode: 'demo', ticket_ok: true });
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
