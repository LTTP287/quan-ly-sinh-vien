import { NextResponse } from 'next/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { getAuthContext, unauthorized } from '@/lib/server/requireAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface StudentInput {
  student_code: string;
  full_name: string;
  email?: string;
  date_of_birth?: string; // yyyy-mm-dd — trở thành mật khẩu đăng nhập (DDMMYYYY)
}

/**
 * Tạo hồ sơ sinh viên từ danh sách Excel và ghi danh vào lớp.
 *
 * Đăng nhập sinh viên nay là MSSV + Ngày sinh, được đối chiếu trực tiếp
 * trong bảng public.users qua RPC authenticate_student() — không còn cần
 * tạo tài khoản Supabase Auth cho từng sinh viên. Route vẫn dùng service-role
 * để bỏ qua RLS khi ghi, nhưng tự kiểm tra người gọi là Giảng viên sở hữu lớp.
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.user.role !== 'lecturer') {
    return NextResponse.json({ error: 'Chỉ Giảng viên mới nhập được danh sách sinh viên.' }, { status: 403 });
  }

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase chưa được cấu hình trên server (chỉ dùng được ở chế độ Supabase).' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const classId: string | undefined = body?.classId;
  const students: StudentInput[] = Array.isArray(body?.students) ? body.students : [];

  if (!classId || students.length === 0) {
    return NextResponse.json({ error: 'Thiếu classId hoặc danh sách sinh viên.' }, { status: 400 });
  }

  const admin = createAdminSupabase(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Người gọi phải sở hữu lớp này (không có RLS session nên kiểm tra tường minh)
  const { data: klass } = await admin.from('classes').select('id, lecturer_id').eq('id', classId).maybeSingle();
  if (!klass || klass.lecturer_id !== auth.user.id) {
    return NextResponse.json({ error: 'Bạn không có quyền nhập sinh viên vào lớp này.' }, { status: 403 });
  }

  const STUDENT_EMAIL_DOMAIN =
    process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'student.university.edu.vn';

  let created = 0;
  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];
  const missingDob: string[] = [];

  for (const s of students) {
    const code = (s.student_code || '').trim().toUpperCase();
    const fullName = (s.full_name || '').trim();

    if (!code || !fullName) {
      skipped += 1;
      continue;
    }
    if (!s.date_of_birth) {
      missingDob.push(code);
    }

    const email = (s.email || `${code.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`).trim().toLowerCase();

    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('student_code', code)
      .maybeSingle();

    let studentId = existing?.id as string | undefined;

    if (!studentId) {
      const { data: inserted, error: insertError } = await admin
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          email,
          student_code: code,
          full_name: fullName,
          role: 'student',
          date_of_birth: s.date_of_birth || null,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        errors.push(`${code}: ${insertError?.message || 'không tạo được hồ sơ'}`);
        continue;
      }

      studentId = inserted.id as string;
      created += 1;
    } else if (s.date_of_birth) {
      // Cập nhật ngày sinh nếu hồ sơ cũ chưa có (không ghi đè nếu đã có, tránh
      // để một dòng Excel sai vô tình đổi mật khẩu của sinh viên đã dùng quen)
      await admin
        .from('users')
        .update({ full_name: fullName })
        .eq('id', studentId)
        .is('date_of_birth', null);
      await admin
        .from('users')
        .update({ date_of_birth: s.date_of_birth })
        .eq('id', studentId)
        .is('date_of_birth', null);
    }

    const { error: enrollError } = await admin
      .from('class_students')
      .upsert({ class_id: classId, student_id: studentId }, { onConflict: 'class_id,student_id' });

    if (enrollError) {
      errors.push(`${code}: ${enrollError.message}`);
      continue;
    }
    enrolled += 1;
  }

  if (missingDob.length > 0) {
    errors.push(
      `${missingDob.length} sinh viên thiếu Ngày sinh trong file Excel nên KHÔNG đăng nhập được: ${missingDob
        .slice(0, 10)
        .join(', ')}${missingDob.length > 10 ? '...' : ''}`
    );
  }

  return NextResponse.json({ created, enrolled, skipped, errors });
}
