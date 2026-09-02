import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { getStudentDashboard } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/student/dashboard
 * Danh sách lớp, bài quiz (đang mở / sắp mở / đã đóng) và lịch sử điểm.
 * Mã phòng thi KHÔNG nằm trong payload — chỉ có cờ `requires_passcode`.
 */
export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  if (auth.user.role !== 'student') {
    return NextResponse.json({ error: 'Chỉ sinh viên mới xem được trang này.' }, { status: 403 });
  }

  const data = await getStudentDashboard(auth.user);

  return NextResponse.json({
    user: data.user,
    classes: data.classes,
    quizzes: {
      open: data.quizzes.filter((q) => q.state === 'open'),
      upcoming: data.quizzes.filter((q) => q.state === 'upcoming'),
      closed: data.quizzes.filter((q) => q.state === 'closed'),
    },
    history: data.history,
  });
}
