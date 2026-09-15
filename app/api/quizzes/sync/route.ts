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
  if (useRemote) {
    const auth = await getAuthContext();
    if (!auth) return unauthorized();
    if (auth.user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Chỉ Giảng viên mới đồng bộ được đề thi.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true, mode: 'remote' });
  }

  // Ở chế độ demo: Chỉ cho phép Giảng viên đồng bộ lên máy chủ
  const auth = await getAuthContext();
  if (auth && auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ Giảng viên mới được phép đồng bộ đề thi.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const quizzes = Array.isArray(body?.quizzes) ? body.quizzes : [];
  const classes = Array.isArray(body?.classes) ? body.classes : [];
  const classStudents = body?.class_students && typeof body.class_students === 'object' ? body.class_students : {};

  const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
  const db = demoDb();

  if (!Array.isArray(db.deleted_quiz_ids)) {
    db.deleted_quiz_ids = [];
  }
  const deletedQuizIds: string[] = Array.isArray(body?.deleted_quiz_ids) ? body.deleted_quiz_ids.map(String) : [];
  if (body?.deleted_quiz_id) {
    deletedQuizIds.push(String(body.deleted_quiz_id));
  }
  if (deletedQuizIds.length > 0) {
    db.deleted_quiz_ids = Array.from(new Set([...db.deleted_quiz_ids, ...deletedQuizIds]));
    db.quizzes = db.quizzes.filter((q) => !db.deleted_quiz_ids!.includes(q.id));
  }

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

  if (Object.keys(classStudents).length > 0) {
    const codesInSync = new Set<string>();
    for (const [classId, stList] of Object.entries(classStudents)) {
      if (Array.isArray(stList)) {
        for (const st of stList as any[]) {
          const c = (st.student_code || '').trim().toUpperCase();
          if (c) codesInSync.add(c);
        }
      }
    }

    // Dọn sạch ghi danh cũ của tất cả sinh viên được đồng bộ để tránh bị dính lớp sai
    db.enrollments = db.enrollments.filter((e) => {
      const u = db.users.find((x) => x.id === e.student_id);
      const code = (u?.student_code || '').trim().toUpperCase();
      return !codesInSync.has(code);
    });

    for (const [classId, stList] of Object.entries(classStudents)) {
      if (!activeClassIds.has(classId) || !Array.isArray(stList)) continue;

      for (const st of stList as any[]) {
        const code = (st.student_code || '').trim().toUpperCase();
        if (!code) continue;

        const canonicalId = `st-${code.toLowerCase()}`;
        let existing = db.users.find((u) => (u.student_code || '').trim().toUpperCase() === code);
        if (existing) {
          existing.full_name = st.full_name || existing.full_name;
          existing.date_of_birth = st.date_of_birth || existing.date_of_birth;
          existing.email = st.email || existing.email;
        } else {
          existing = {
            id: st.id || canonicalId,
            student_code: code,
            full_name: st.full_name || code,
            email: st.email || `${code.toLowerCase()}@student.university.edu.vn`,
            role: 'student',
            date_of_birth: st.date_of_birth,
          };
          db.users.push(existing);
        }

        // Ghi danh CHÍNH XÁC sinh viên vào lớp học phần này (cho cả existing ID lẫn canonical ID)
        const targetIds = Array.from(new Set([existing.id, canonicalId]));
        for (const tId of targetIds) {
          if (!db.enrollments.some((e) => e.class_id === classId && e.student_id === tId)) {
            db.enrollments.push({ class_id: classId, student_id: tId });
          }
        }
      }
    }
  }

  // 3. Đồng bộ đề thi (kèm đầy đủ Ngân hàng câu hỏi & đáp án)
  if (Array.isArray(quizzes)) {
    const activeQuizIds = new Set(quizzes.map((q: any) => q.id).filter(Boolean));
    // Dọn sạch các đề thi đã bị xóa khỏi danh sách của giảng viên
    db.quizzes = db.quizzes.filter((q) => activeQuizIds.has(q.id));

    // Nếu giảng viên đã tạo đề thi thật (không phải đề mẫu Logistics), dọn sạch các đề mẫu cũ
    if (quizzes.some((q: any) => !q.id.startsWith('quiz-logistics-'))) {
      db.quizzes = db.quizzes.filter((q) => !q.id.startsWith('quiz-logistics-'));
    }

    for (const q of quizzes) {
      if (!q.id) continue;
      const classIds = Array.isArray(q.assigned_class_ids) ? q.assigned_class_ids : [];
      let passcode = (q.passcode || q.access_code || '').trim().toUpperCase();
      if (!passcode && q.class_schedules) {
        for (const sc of Object.values(q.class_schedules as Record<string, any>)) {
          if (sc?.access_code?.trim()) {
            passcode = sc.access_code.trim().toUpperCase();
            break;
          }
        }
      }
      const titleLower = (q.title || '').toLowerCase();
      const isMidterm = q.id === 'midterm-scm-2026' || titleLower.includes('midterm');
      if (!passcode && isMidterm) {
        passcode = 'LOG888';
      }
      const isQuiz05 = q.id.includes('quiz-05') || titleLower.includes('quiz 05') || titleLower.includes('quiz - 05');
      if (!passcode && isQuiz05) {
        passcode = 'SCM201';
      }
      const isQuiz08 = q.id.includes('quiz-08') || titleLower.includes('quiz 08') || titleLower.includes('quiz - 08');
      if (!passcode && isQuiz08) {
        passcode = 'QUIZ08';
      }

      const idx = db.quizzes.findIndex((x) => x.id === q.id);
      const questionsList = (Array.isArray(q.questions) && q.questions.length > 0)
        ? q.questions
        : (idx >= 0 && db.quizzes[idx]?.questions && db.quizzes[idx].questions!.length > 0)
          ? db.quizzes[idx].questions
          : (await import('@/lib/classStore')).createDefaultMidtermQuiz().questions;

      let sectionSampling = q.section_sampling || null;
      if (!sectionSampling && isMidterm) {
        sectionSampling = {
          multiple_choice: 20,
          short_answer: 3,
          long_answer: 1,
        };
      }

      const totalNeeded = sectionSampling
        ? (sectionSampling.multiple_choice || 0) + (sectionSampling.short_answer || 0) + (sectionSampling.long_answer || 0)
        : questionsList.length;

      const questionsPerStudent = Number(q.questions_per_student) > 0
        ? Number(q.questions_per_student)
        : (isMidterm ? 24 : totalNeeded);

      let computedStartAt = q.start_at;
      let computedEndAt = q.end_at;
      if (q.class_schedules && Object.keys(q.class_schedules).length > 0) {
        const scList = Object.values(q.class_schedules as Record<string, any>);
        const starts = scList.map((s) => s?.start_at).filter(Boolean).map((d) => new Date(d).getTime()).filter((t) => !isNaN(t));
        const ends = scList.map((s) => s?.end_at).filter(Boolean).map((d) => new Date(d).getTime()).filter((t) => !isNaN(t));
        if (starts.length > 0) computedStartAt = new Date(Math.min(...starts)).toISOString();
        if (ends.length > 0) computedEndAt = new Date(Math.max(...ends)).toISOString();
      }

      const demoQuizItem: any = {
        id: q.id,
        title: q.title || 'Đề thi',
        description: q.description || '',
        time_limit_minutes: Number(q.time_limit_minutes) || 45,
        is_published: q.is_published !== false,
        show_results: !!q.show_results,
        passcode: passcode || null,
        passcode_expires_at: q.passcode_expires_at || null,
        class_ids: classIds,
        class_schedules: q.class_schedules || {},
        start_at: computedStartAt || new Date(Date.now() - 3600000).toISOString(),
        end_at: computedEndAt || new Date(Date.now() + 86400000 * 7).toISOString(),
        is_active: q.is_active !== false,
        shuffle_questions: q.shuffle_questions !== false,
        shuffle_options: q.shuffle_options !== false,
        prevent_previous: !!q.prevent_previous,
        questions_per_student: questionsPerStudent,
        section_sampling: sectionSampling,
        questions: questionsList.map((item: any) => ({
          id: item.id,
          quiz_id: q.id,
          question_text: item.question_text,
          question_type: item.question_type,
          points: item.points,
          order_index: item.order_index,
          image_url: item.image_url || null,
          options: Array.isArray(item.options) ? item.options : [],
        })),
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

/**
 * DELETE /api/quizzes/sync?id=<quiz_id>
 * Xoá vĩnh viễn đề thi khỏi demoStore của Server và lưu vào danh sách deleted_quiz_ids
 */
export async function DELETE(request: Request) {
  const auth = await getAuthContext();
  if (auth && auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ Giảng viên mới được phép xóa đề thi.' }, { status: 403 });
  }

  const url = new URL(request.url);
  let quizId = url.searchParams.get('id');
  if (!quizId) {
    const body = await request.json().catch(() => null);
    quizId = body?.quiz_id || body?.id;
  }

  if (!quizId) {
    return NextResponse.json({ error: 'Thiếu mã đề thi.' }, { status: 400 });
  }

  const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
  const db = demoDb();
  if (!Array.isArray(db.deleted_quiz_ids)) {
    db.deleted_quiz_ids = [];
  }
  if (!db.deleted_quiz_ids.includes(quizId)) {
    db.deleted_quiz_ids.push(quizId);
  }
  db.quizzes = db.quizzes.filter((q) => q.id !== quizId);
  saveDemoDb();

  return NextResponse.json({ ok: true, deleted: quizId });
}
