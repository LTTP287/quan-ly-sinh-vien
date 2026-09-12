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

    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập Mã sinh viên.' }, { status: 400 });
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
            db.users[idx] = { ...db.users[idx], ...st };
          } else {
            db.users.push(st);
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
        const { DEFAULT_QUESTION_BANK } = await import('@/lib/classStore');
        for (const q of body.demo_quizzes) {
          if (!q.id) continue;
          const idx = db.quizzes.findIndex((x) => x.id === q.id);
          const classIds = Array.isArray(q.assigned_class_ids) && q.assigned_class_ids.length > 0
            ? q.assigned_class_ids
            : (q.class_id ? [q.class_id] : Object.keys(q.class_schedules || {}));

          const demoQuizItem: any = {
            id: q.id,
            title: q.title || 'Quiz - 05',
            description: q.description || '',
            time_limit_minutes: Number(q.time_limit_minutes) || 5,
            is_published: q.is_published !== false,
            show_results: !!q.show_results,
            passcode: q.passcode || q.access_code || null,
            passcode_expires_at: q.passcode_expires_at || null,
            class_ids: classIds,
            start_at: q.start_at || new Date(Date.now() - 3600000).toISOString(),
            end_at: q.end_at || new Date(Date.now() + 86400000 * 30).toISOString(),
            is_active: q.is_active !== false,
            shuffle_questions: q.shuffle_questions !== false,
            shuffle_options: q.shuffle_options !== false,
            prevent_previous: !!q.prevent_previous,
            questions_per_student: q.questions_per_student,
            questions: (Array.isArray(q.questions) && q.questions.length > 0) ? q.questions : (idx >= 0 && db.quizzes[idx]?.questions && db.quizzes[idx].questions!.length > 0 ? db.quizzes[idx].questions : DEFAULT_QUESTION_BANK),
          };
          if (idx >= 0) {
            db.quizzes[idx] = { ...db.quizzes[idx], ...demoQuizItem };
          } else {
            db.quizzes.push(demoQuizItem);
          }
        }
      }
      saveDemoDb();
    }

    if (body.mode === 'in_class') {
      const passcode = String(body.passcode || '').trim().toUpperCase();
      const { demoDb } = await import('@/lib/server/demoStore');
      const db = demoDb();
      const stUser = db.users.find(
        (u) => u.role === 'student' && (u.student_code || '').trim().toUpperCase() === code.toUpperCase()
      );
      if (!stUser) {
        return NextResponse.json(
          { error: 'Mã sinh viên không có trong danh sách lớp được phân bổ.' },
          { status: 401 }
        );
      }

      // Tìm lớp sinh viên đang theo học
      const enrolledClassIds = new Set(
        db.enrollments
          .filter(
            (e) => e.student_id === stUser.id || (stUser.student_code && e.student_id === `st-${stUser.student_code}`)
          )
          .map((e) => e.class_id)
      );

      // Tìm các bài quiz mở cho các lớp của sinh viên
      const availableQuizzes = db.quizzes.filter((q) => {
        if (!q.is_published || q.is_active === false) return false;
        const qClasses = Array.isArray(q.class_ids) ? q.class_ids : [];
        return qClasses.some((cId) => enrolledClassIds.has(cId));
      });

      if (availableQuizzes.length === 0) {
        return NextResponse.json(
          { error: 'Lớp học phần của bạn hiện chưa có bài thi nào đang mở.' },
          { status: 404 }
        );
      }

      // Khớp bài quiz
      let targetQuiz = availableQuizzes.find((q) => {
        const qPass = (q.passcode || '').trim().toUpperCase();
        return qPass && qPass === passcode;
      });

      if (!targetQuiz) {
        const requirePassQuiz = availableQuizzes.find((q) => !!q.passcode);
        if (requirePassQuiz && (!passcode || (requirePassQuiz.passcode || '').trim().toUpperCase() !== passcode)) {
          return NextResponse.json(
            { error: 'Mã phòng thi không chính xác hoặc bài thi yêu cầu mã phòng thi hợp lệ.' },
            { status: 403 }
          );
        }
        targetQuiz = availableQuizzes[0];
      }

      // Kiểm tra xem đã nộp bài thi này chưa
      const existingScore = db.scores.find((s) => {
        if (s.quiz_id !== targetQuiz!.id || !s.submitted_at) return false;
        if (s.student_id === stUser.id) return true;
        if (stUser.student_code && s.student_id === `st-${stUser.student_code}`) return true;
        return false;
      });

      if (existingScore) {
        return NextResponse.json(
          { error: 'Bạn đã hoàn thành bài thi này rồi và không thể làm lại.' },
          { status: 409 }
        );
      }

      user = {
        id: stUser.id,
        email: stUser.email,
        student_code: stUser.student_code,
        full_name: stUser.full_name,
        role: 'student' as const,
      };

      // Đăng nhập phiên + phát vé phòng thi
      const { createSession, updateSessionToken } = await import('@/lib/server/backend');
      const { signJwt, SESSION_COOKIE, SESSION_TTL_SECONDS, examTicketCookie, EXAM_TICKET_TTL_SECONDS } = await import(
        '@/lib/auth/jwt'
      );

      const provisional = await signJwt(
        { sub: user.id, sid: 'pending', role: user.role, code: user.student_code, name: user.full_name },
        SESSION_TTL_SECONDS
      );
      const sessionId = await createSession(user.id, provisional, request.headers.get('user-agent'));
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
      await updateSessionToken(sessionId, token);

      const ticket = await signJwt({ sub: user.id, quiz: targetQuiz.id }, EXAM_TICKET_TTL_SECONDS);

      const response = NextResponse.json({
        user: {
          id: user.id,
          full_name: user.full_name,
          role: user.role,
          student_code: user.student_code,
          email: user.email,
        },
        redirect: `/student/exam/${targetQuiz.id}`,
      });

      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
      });

      response.cookies.set(examTicketCookie(targetQuiz.id), ticket, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: EXAM_TICKET_TTL_SECONDS,
      });

      return response;
    }

    const dob = normalizeDob(String(body.date_of_birth || ''));
    if (!dob) {
      return NextResponse.json({ error: 'Vui lòng nhập Ngày sinh (DDMMYYYY).' }, { status: 400 });
    }

    user = await authenticateStudent(code, dob);
    if (!user) {
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
