import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { checkQuizPasscode, PASSCODE_MESSAGES } from '@/lib/server/backend';
import { signJwt, examTicketCookie, EXAM_TICKET_TTL_SECONDS } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/quizzes/verify-passcode   { quiz_id, passcode }
 *
 * Kiểm tra trên SERVER: mã phòng thi đúng + còn hiệu lực + đang trong khung giờ
 * của lớp + sinh viên có được giao bài. Hợp lệ thì phát "vé vào phòng thi"
 * (JWT sống 5 phút, cookie httpOnly) để trang làm bài đổi lấy đề.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  if (auth.user.role !== 'student') {
    return NextResponse.json({ error: 'Chỉ sinh viên mới vào được phòng thi.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  const passcode = String(body?.passcode || '').trim();

  if (!quizId) {
    return NextResponse.json({ error: 'Thiếu mã bài thi.' }, { status: 400 });
  }
  if (!passcode) {
    return NextResponse.json(
      { error: 'Vui lòng nhập mã phòng thi.', reason: 'WRONG_PASSCODE' },
      { status: 400 }
    );
  }

  const result = await checkQuizPasscode(quizId, auth.user.id, passcode);

  if (!result.ok) {
    const reason = result.reason || 'WRONG_PASSCODE';
    return NextResponse.json(
      { error: PASSCODE_MESSAGES[reason], reason },
      { status: reason === 'WRONG_PASSCODE' || reason === 'PASSCODE_EXPIRED' ? 403 : 409 }
    );
  }

  const ticket = await signJwt(
    { sub: auth.user.id, quiz: quizId },
    EXAM_TICKET_TTL_SECONDS
  );

  const response = NextResponse.json({
    ok: true,
    quiz_id: quizId,
    time_limit_minutes: result.timeLimitMinutes,
    redirect: `/student/exam/${quizId}`,
  });

  response.cookies.set(examTicketCookie(quizId), ticket, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: EXAM_TICKET_TTL_SECONDS,
  });

  return response;
}
