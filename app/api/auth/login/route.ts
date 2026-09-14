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
    const rawDob = String(body.date_of_birth || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập Mã sinh viên.' }, { status: 400 });
    }
    if (!rawDob) {
      return NextResponse.json(
        { error: 'Vui lòng nhập ngày sinh.' },
        { status: 400 }
      );
    }

    // Đồng bộ dữ liệu demo (sinh viên, lớp học, đề thi) từ trình duyệt lên bộ nhớ server
    if (body.demo_students || body.demo_classes || body.demo_quizzes || body.demo_enrollments) {
      const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
      const db = demoDb();
      if (Array.isArray(body.demo_students)) {
        for (const st of body.demo_students) {
          const stCode = (st.student_code || '').trim().toUpperCase();
          if (!stCode) continue;
          const idx = db.users.findIndex((u) => (u.student_code || '').trim().toUpperCase() === stCode);
          if (idx >= 0) {
            const existingId = db.users[idx].id;
            const existingDob = db.users[idx].date_of_birth;
            db.users[idx] = {
              ...db.users[idx],
              ...st,
              id: existingId, // KHÔNG BAO GIỜ ghi đè id cũ để không làm gãy liên kết điểm số (scores)
              student_code: stCode,
              date_of_birth: st.date_of_birth || existingDob,
            };
          } else {
            db.users.push({
              ...st,
              id: st.id || `st-${stCode.toLowerCase()}`,
              student_code: stCode,
            });
          }
        }
      }
      if (Array.isArray(body.demo_classes) && body.demo_classes.length > 0) {
        for (const c of body.demo_classes) {
          const idx = db.classes.findIndex((x) => x.id === c.id);
          if (idx >= 0) {
            db.classes[idx] = { ...db.classes[idx], ...c };
          } else {
            db.classes.push(c);
          }
        }
      }
      if (Array.isArray(body.demo_enrollments)) {
        for (const en of body.demo_enrollments) {
          const stCode = (en.student_code || '').trim().toUpperCase();
          const stUser = db.users.find((u) => (u.student_code || '').trim().toUpperCase() === stCode);
          const stId = stUser ? stUser.id : en.student_id;
          if (stId && !db.enrollments.some((e) => e.class_id === en.class_id && e.student_id === stId)) {
            db.enrollments.push({ class_id: en.class_id, student_id: stId });
          }
        }
      }
      if (Array.isArray(body.demo_quizzes) && body.demo_quizzes.length > 0) {
        for (const q of body.demo_quizzes) {
          if (!q.id) continue;
          let passcode = (q.passcode || q.access_code || '').trim().toUpperCase();
          const titleLower = (q.title || '').toLowerCase();
          if (!passcode) {
            if (q.id === 'midterm-scm-2026' || titleLower.includes('midterm')) passcode = 'LOG888';
            else if (q.id.includes('quiz-05') || titleLower.includes('quiz 05') || titleLower.includes('quiz - 05')) passcode = 'SCM201';
            else if (q.id.includes('quiz-08') || titleLower.includes('quiz 08') || titleLower.includes('quiz - 08')) passcode = 'QUIZ08';
          }
          const idx = db.quizzes.findIndex((x) => x.id === q.id);
          const demoItem = {
            id: q.id,
            title: q.title || 'Đề thi',
            description: q.description || '',
            time_limit_minutes: Number(q.time_limit_minutes) || 45,
            is_published: q.is_published !== false,
            show_results: !!q.show_results,
            passcode: passcode || null,
            passcode_expires_at: q.passcode_expires_at || null,
            class_ids: Array.isArray(q.assigned_class_ids) && q.assigned_class_ids.length > 0 ? q.assigned_class_ids : (q.class_ids || ['class-scm201-i']),
            class_schedules: q.class_schedules || {},
            start_at: q.start_at || new Date(Date.now() - 3600000).toISOString(),
            end_at: q.end_at || new Date(Date.now() + 86400000 * 7).toISOString(),
            is_active: q.is_active !== false,
            shuffle_questions: q.shuffle_questions !== false,
            shuffle_options: q.shuffle_options !== false,
            prevent_previous: !!q.prevent_previous,
            questions_per_student: Number(q.questions_per_student) || (q.questions?.length || 5),
            section_sampling: q.section_sampling || null,
            questions: Array.isArray(q.questions) ? q.questions : [],
          };
          if (idx >= 0) {
            db.quizzes[idx] = { ...db.quizzes[idx], ...demoItem };
          } else {
            db.quizzes.push(demoItem);
          }
        }
      }
      saveDemoDb();
    }

    user = await authenticateStudent(code, String(body.date_of_birth || ''));
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

  const isHttps = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
