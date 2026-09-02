/**
 * Kho dữ liệu phía SERVER cho chế độ demo (chưa cấu hình Supabase).
 *
 * Đây là singleton trong bộ nhớ tiến trình Next.js — mất khi restart server.
 * Chỉ dùng để chạy thử luồng đăng nhập / mã phòng thi thật sự trên server.
 * Dữ liệu thi thật nằm ở Supabase.
 */

export interface DemoUser {
  id: string;
  email: string;
  student_code: string | null;
  full_name: string;
  role: 'student' | 'lecturer';
  date_of_birth?: string; // yyyy-mm-dd
  password?: string; // chỉ dùng cho giảng viên ở chế độ demo
}

export interface DemoSession {
  id: string;
  user_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  user_agent?: string | null;
}

export interface DemoQuiz {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  is_published: boolean;
  show_results: boolean;
  passcode: string | null;
  passcode_expires_at: string | null;
  class_ids: string[];
  start_at: string;
  end_at: string;
  is_active: boolean;
}

export interface DemoScore {
  quiz_id: string;
  student_id: string;
  total_score: number | null;
  submitted_at: string | null;
  status: 'in_progress' | 'submitted' | 'timed_out';
  tab_violations_count: number;
}

interface DemoDb {
  users: DemoUser[];
  classes: { id: string; code: string; name: string; semester: string }[];
  enrollments: { class_id: string; student_id: string }[];
  quizzes: DemoQuiz[];
  sessions: DemoSession[];
  scores: DemoScore[];
}

const HOUR = 3600_000;

function seed(): DemoDb {
  const students: DemoUser[] = [
    { id: 'st-1', student_code: '20120001', full_name: 'Nguyễn Văn An', date_of_birth: '2004-01-15' },
    { id: 'st-2', student_code: '20120002', full_name: 'Lê Thị Bình', date_of_birth: '2004-03-22' },
    { id: 'st-3', student_code: '20120003', full_name: 'Phạm Hoàng Cường', date_of_birth: '2003-11-05' },
    { id: 'st-4', student_code: '20120004', full_name: 'Trần Thị Dung', date_of_birth: '2004-07-30' },
    { id: 'st-5', student_code: '20120005', full_name: 'Hoàng Văn Em', date_of_birth: '2003-09-12' },
  ].map((s) => ({
    ...s,
    email: `${s.student_code}@student.university.edu.vn`,
    role: 'student' as const,
  }));

  return {
    users: [
      // Chủ sở hữu hệ thống (Owner) — đăng nhập được bằng 1 trong 2 email này
      {
        id: 'owner-uuid-1',
        email: 'phuong.lethanh797@gmail.com',
        student_code: null,
        full_name: 'ThS. Lê Thị Thanh Phương',
        role: 'lecturer',
        password: 'LeminhPhuc@2512',
      },
      {
        id: 'owner-uuid-2',
        email: 'letthanhphuong3@dtu.edu.vn',
        student_code: null,
        full_name: 'ThS. Lê Thị Thanh Phương',
        role: 'lecturer',
        password: 'LeminhPhuc@2512',
      },
      {
        id: 'lecturer-uuid-1',
        email: 'giangvien@edu.vn',
        student_code: null,
        full_name: 'TS. Nguyễn Văn A',
        role: 'lecturer',
        password: 'GiangVien@2026',
      },
      ...students,
    ],
    classes: [
      { id: 'class-1', code: 'LOG101', name: 'Introduction to Logistics & SCM - Nhóm 01', semester: 'HKI (2026 - 2027)' },
      { id: 'class-2', code: 'LOG101', name: 'Introduction to Logistics & SCM - Nhóm 02', semester: 'HKI (2026 - 2027)' },
    ],
    enrollments: [
      { class_id: 'class-1', student_id: 'st-1' },
      { class_id: 'class-1', student_id: 'st-2' },
      { class_id: 'class-1', student_id: 'st-3' },
      { class_id: 'class-2', student_id: 'st-4' },
      { class_id: 'class-2', student_id: 'st-5' },
    ],
    quizzes: [
      {
        id: 'quiz-logistics-1',
        title: 'Bài Kiểm Tra Giữa Kỳ - Introduction to Logistics & SCM',
        description: 'Đề thi trắc nghiệm rút ngẫu nhiên 5 câu từ Ngân hàng đề thi chung.',
        time_limit_minutes: 45,
        is_published: true,
        show_results: false,
        passcode: 'LOG888',
        passcode_expires_at: new Date(Date.now() + 24 * HOUR * 7).toISOString(),
        class_ids: ['class-1', 'class-2'],
        start_at: new Date(Date.now() - HOUR).toISOString(),
        end_at: new Date(Date.now() + 24 * HOUR * 7).toISOString(),
        is_active: true,
      },
      {
        id: 'quiz-logistics-2',
        title: 'Bài Kiểm Tra Cuối Kỳ - Logistics & SCM',
        description: 'Ca thi cuối kỳ, phòng thi mở theo lịch khoa.',
        time_limit_minutes: 60,
        is_published: true,
        show_results: false,
        passcode: 'LOG999',
        passcode_expires_at: new Date(Date.now() + 24 * HOUR * 30).toISOString(),
        class_ids: ['class-1', 'class-2'],
        start_at: new Date(Date.now() + 24 * HOUR * 14).toISOString(),
        end_at: new Date(Date.now() + 24 * HOUR * 15).toISOString(),
        is_active: true,
      },
      {
        id: 'quiz-logistics-0',
        title: 'Bài Kiểm Tra Chương 1 - Nhập môn Logistics',
        description: 'Ca thi đã kết thúc.',
        time_limit_minutes: 30,
        is_published: true,
        show_results: true,
        passcode: 'LOG777',
        passcode_expires_at: new Date(Date.now() - 24 * HOUR * 5).toISOString(),
        class_ids: ['class-1', 'class-2'],
        start_at: new Date(Date.now() - 24 * HOUR * 7).toISOString(),
        end_at: new Date(Date.now() - 24 * HOUR * 5).toISOString(),
        is_active: true,
      },
    ],
    sessions: [],
    scores: [
      {
        quiz_id: 'quiz-logistics-0',
        student_id: 'st-1',
        total_score: 8.5,
        submitted_at: new Date(Date.now() - 24 * HOUR * 5).toISOString(),
        status: 'submitted',
        tab_violations_count: 0,
      },
    ],
  };
}

// Giữ qua các lần hot-reload của Next dev server
const globalStore = globalThis as unknown as { __uniquizDemoDb?: DemoDb };

export function demoDb(): DemoDb {
  if (!globalStore.__uniquizDemoDb) {
    globalStore.__uniquizDemoDb = seed();
  }
  return globalStore.__uniquizDemoDb;
}

/** Ngày sinh -> chuỗi mật khẩu DDMMYYYY */
export function dobToPassword(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${d.getUTCFullYear()}`;
}
