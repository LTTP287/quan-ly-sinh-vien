import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyJwt, type JwtPayload } from '@/lib/auth/jwt';
import { isSessionActive, type AuthUser } from './backend';

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

/**
 * Đọc token từ cookie, xác minh chữ ký JWT VÀ kiểm tra phiên còn sống trong DB.
 * Bước kiểm tra DB là thứ làm Single Session Lock có hiệu lực tức thì:
 * khi phiên bị thu hồi, JWT cũ tuy còn hạn nhưng không dùng được nữa.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyJwt<JwtPayload>(token);
  if (!payload) return null;

  if (!(await isSessionActive(payload.sid, token))) return null;

  return {
    sessionId: payload.sid,
    user: {
      id: payload.sub,
      email: (payload.email as string) || '',
      student_code: payload.code || null,
      full_name: payload.name || '',
      role: payload.role,
    },
  };
}

export function unauthorized(message = 'Phiên đăng nhập không hợp lệ hoặc đã bị thay thế.') {
  return NextResponse.json({ error: message, code: 'SESSION_INVALID' }, { status: 401 });
}
