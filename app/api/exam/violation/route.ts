import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { recordViolationAdmin, useRemote } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST /api/exam/violation { quiz_id, message } -> so lan vi pham sau khi tang */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const body = await request.json().catch(() => null);
  const quizId = String(body?.quiz_id || '').trim();
  if (!quizId) return NextResponse.json({ error: 'Thieu ma bai thi.' }, { status: 400 });

  if (!useRemote) return NextResponse.json({ count: null });

  const count = await recordViolationAdmin(quizId, auth.user.id, String(body?.message || ''));
  return NextResponse.json({ count });
}
