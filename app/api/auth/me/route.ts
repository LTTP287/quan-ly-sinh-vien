import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Trả về người dùng của phiên hiện tại. 401 nếu phiên đã bị thay thế/thu hồi. */
export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return NextResponse.json({ user: auth.user, session_id: auth.sessionId });
}
