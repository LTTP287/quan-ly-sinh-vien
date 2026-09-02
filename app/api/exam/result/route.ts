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

  if (!useRemote) return NextResponse.json({ mode: 'demo' });

  const result = await getMyResultAdmin(quizId, auth.user.id);
  return NextResponse.json({ mode: 'remote', result });
}
