import { NextResponse } from 'next/server';
import {
  authenticateStudent,
  authenticateLecturer,
  createSession,
  normalizeDob,
} from '@/lib/server/backend';
import { signJwt, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 *
 * Sinh viên : { role: 'student',  student_code: '20120001', date_of_birth: '15012004' }
 * Giảng viên: { role: 'lecturer', email: '...', password: '...' }
 *
 * Trả về JWT đặt trong cookie httpOnly và áp Single Session Lock:
 * phiên cũ của chính tài khoản đó bị thu hồi ngay.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const role = body.role === 'lecturer' ? 'lecturer' : 'student';
  let user = null;

  if (role === 'student') {
    const code = String(body.student_code || '').trim();
    const dob = normalizeDob(String(body.date_of_birth || ''));

    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập Mã sinh viên.' }, { status: 400 });
    }
    if (dob.length !== 8) {
      return NextResponse.json(
        { error: 'Ngày sinh phải đủ 8 chữ số theo định dạng DDMMYYYY.' },
        { status: 400 }
      );
    }

    user = await authenticateStudent(code, dob);
    if (!user) {
      // Không phân biệt "sai MSSV" với "sai ngày sinh" để tránh dò tài khoản
      return NextResponse.json(
        { error: 'Mã sinh viên hoặc ngày sinh không đúng.' },
        { status: 401 }
      );
    }
  } else {
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    }

    user = await authenticateLecturer(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }
  }

  // Ký JWT với sessionId rỗng trước, rồi ghi phiên, rồi ký lại kèm sessionId thật.
  // Cách đơn giản hơn: sinh sessionId ở tầng DB nên ta ký sau khi có id.
  const provisional = await signJwt(
    { sub: user.id, sid: 'pending', role: user.role, code: user.student_code, name: user.full_name },
    SESSION_TTL_SECONDS
  );

  let sessionId: string;
  try {
    sessionId = await createSession(user.id, provisional, request.headers.get('user-agent'));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Không tạo được phiên.' }, { status: 500 });
  }

  const token = await signJwt(
    {
      sub: user.id,
      sid: sessionId,
      role: user.role,
      code: user.student_code,
      name: user.full_name,
      email: user.email,
    },
    SESSION_TTL_SECONDS
  );

  // Cập nhật token_hash của phiên vừa tạo sang token cuối cùng
  const { updateSessionToken } = await import('@/lib/server/backend');
  await updateSessionToken(sessionId, token);

  const response = NextResponse.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      student_code: user.student_code,
      email: user.email,
    },
    redirect: user.role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard',
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
