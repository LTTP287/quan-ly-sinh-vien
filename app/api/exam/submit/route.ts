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
    const res = NextResponse.json({ mode: 'demo' });
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
