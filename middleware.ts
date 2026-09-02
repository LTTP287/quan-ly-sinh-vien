import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifyJwt, type JwtPayload } from '@/lib/auth/jwt';

const LECTURER_PREFIX = '/lecturer';
const STUDENT_PREFIX = '/student';

/**
 * Chặn truy cập /lecturer/* và /student/* khi chưa đăng nhập, và chặn sai vai trò.
 *
 * Middleware chạy trên Edge Runtime nên ở đây chỉ xác minh CHỮ KÝ + hạn của JWT.
 * Việc đối chiếu phiên trong DB (Single Session Lock) do các API route thực hiện
 * qua getAuthContext() — nghĩa là một token đã bị thay thế vẫn qua được middleware
 * nhưng KHÔNG gọi được bất kỳ API nào, nên không đọc được dữ liệu.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLecturerArea = path.startsWith(LECTURER_PREFIX);
  const isStudentArea = path.startsWith(STUDENT_PREFIX);
  if (!isLecturerArea && !isStudentArea) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifyJwt<JwtPayload>(token) : null;

  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = isLecturerArea ? '/login/lecturer' : '/login/student';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (isLecturerArea && payload.role !== 'lecturer') {
    const url = request.nextUrl.clone();
    url.pathname = '/student/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isStudentArea && payload.role !== 'student') {
    const url = request.nextUrl.clone();
    url.pathname = '/lecturer/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/lecturer/:path*', '/student/:path*'],
};
