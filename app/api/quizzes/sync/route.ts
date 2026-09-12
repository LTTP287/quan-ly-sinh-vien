import { NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';
import { demoDb, DemoQuiz } from '@/lib/server/demoStore';
import { useRemote } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/quizzes/sync
 * Đồng bộ các đề thi và lịch thi từ localStorage của Giảng viên lên bộ nhớ demoStore của Server.
 * Giúp sinh viên đăng nhập trên thiết bị/trình duyệt khác thấy ngay đề thi đã Publish.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ Giảng viên mới đồng bộ được đề thi.' }, { status: 403 });
  }

  if (useRemote) {
    return NextResponse.json({ ok: true, mode: 'remote' });
  }

  const body = await request.json().catch(() => null);
  const quizzes = Array.isArray(body?.quizzes) ? body.quizzes : [];
  const classes = Array.isArray(body?.classes) ? body.classes : [];
  const classStudents = body?.class_students && typeof body.class_students === 'object' ? body.class_students : {};

  const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
  const db = demoDb();

  // 1. Đồng bộ lớp học phần từ Giảng viên
  if (classes.length > 0) {
    db.classes = classes.map((c: any) => ({
      id: c.id,
      code: c.code || 'MH101',
      name: c.name || 'Lớp học phần',
      semester: c.semester || 'HKI (2026 - 2027)',
    }));
  }

  // 2. Đồng bộ danh sách sinh viên theo đúng từng lớp học phần (phân bổ từ Excel)
  // Xóa các ghi danh cũ không còn trong danh sách các lớp hiện tại
  const activeClassIds = new Set(db.classes.map((c) => c.id));
  db.enrollments = db.enrollments.filter((e) => activeClassIds.has(e.class_id));

  for (const [classId, stList] of Object.entries(classStudents)) {
    if (!activeClassIds.has(classId) || !Array.isArray(stList)) continue;

    for (const st of stList as any[]) {
      const code = (st.student_code || '').trim().toUpperCase();
      if (!code) continue;

      let existing = db.users.find((u) => (u.student_code || '').trim().toUpperCase() === code);
      if (existing) {
        existing.full_name = st.full_name || existing.full_name;
        existing.date_of_birth = st.date_of_birth || existing.date_of_birth;
        existing.email = st.email || existing.email;
      } else {
        existing = {
          id: st.id || `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          student_code: code,
          full_name: st.full_name || code,
          email: st.email || `${code.toLowerCase()}@student.university.edu.vn`,
          role: 'student',
          date_of_birth: st.date_of_birth,
        };
        db.users.push(existing);
      }

      // Ghi danh CHÍNH XÁC sinh viên vào lớp học phần này
      if (!db.enrollments.some((e) => e.class_id === classId && e.student_id === existing.id)) {
        db.enrollments.push({ class_id: classId, student_id: existing.id });
      }
    }
  }

  // 3. Đồng bộ đề thi (kèm đầy đủ Ngân hàng câu hỏi & đáp án)
  if (quizzes.length > 0) {
    // Nếu giảng viên đã tạo đề thi thật (không phải đề mẫu Logistics), dọn sạch các đề mẫu cũ
    if (quizzes.some((q: any) => !q.id.startsWith('quiz-logistics-'))) {
      db.quizzes = db.quizzes.filter((q) => !q.id.startsWith('quiz-logistics-'));
    }

    for (const q of quizzes) {
      if (!q.id) continue;
      const classIds = Array.isArray(q.assigned_class_ids) ? q.assigned_class_ids : [];
      const passcode = q.passcode || q.access_code || '';

      const idx = db.quizzes.findIndex((x) => x.id === q.id);
      const demoQuizItem: any = {
        id: q.id,
        title: q.title || 'Đề thi',
        description: q.description || '',
        time_limit_minutes: Number(q.time_limit_minutes) || 45,
        is_published: q.is_published !== false,
        show_results: !!q.show_results,
        passcode: passcode.trim().toUpperCase() || null,
        passcode_expires_at: q.passcode_expires_at || null,
        class_ids: classIds,
        start_at: q.start_at || new Date(Date.now() - 3600000).toISOString(),
        end_at: q.end_at || new Date(Date.now() + 86400000 * 7).toISOString(),
        is_active: q.is_active !== false,
        shuffle_questions: q.shuffle_questions !== false,
        shuffle_options: q.shuffle_options !== false,
        prevent_previous: !!q.prevent_previous,
        questions_per_student: q.questions_per_student,
        questions: (Array.isArray(q.questions) && q.questions.length > 0)
          ? q.questions
          : (idx >= 0 && db.quizzes[idx]?.questions && db.quizzes[idx].questions!.length > 0)
            ? db.quizzes[idx].questions
            : (await import('@/lib/classStore')).DEFAULT_QUESTION_BANK,
      };

      if (idx >= 0) {
        db.quizzes[idx] = demoQuizItem;
      } else {
        db.quizzes.push(demoQuizItem);
      }
    }
  }

  // Lưu bền vững ra đĩa (/tmp/uniquiz_store.json) để không mất khi restart/serverless warm reload
  saveDemoDb();

  return NextResponse.json({
    ok: true,
    synced_classes: db.classes.length,
    synced_quizzes: db.quizzes.length,
    synced_students: db.users.filter((u) => u.role === 'student').length,
    synced_enrollments: db.enrollments.length,
  });
}
