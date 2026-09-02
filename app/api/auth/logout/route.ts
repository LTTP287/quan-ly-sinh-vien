import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/jwt';
import { getAuthContext } from '@/lib/server/requireAuth';
import { revokeSession } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const auth = await getAuthContext();
  if (auth) await revokeSession(auth.sessionId, 'LOGOUT');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
