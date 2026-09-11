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

import fs from 'fs';
import path from 'path';

export interface DemoQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface DemoQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  points: number;
  order_index: number;
  image_url?: string | null;
  options?: DemoQuestionOption[];
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
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  prevent_previous?: boolean;
  questions_per_student?: number;
  questions?: DemoQuestion[];
}

export interface DemoScore {
  quiz_id: string;
  student_id: string;
  total_score: number | null;
  submitted_at: string | null;
  status: 'in_progress' | 'submitted' | 'timed_out';
  tab_violations_count: number;
  warning_history?: { timestamp: string; event: string; message: string }[];
  answers?: { question_id: string; option_id?: string | null; answer_text?: string }[];
}

export interface DemoDb {
  users: DemoUser[];
  classes: { id: string; code: string; name: string; semester: string }[];
  enrollments: { class_id: string; student_id: string }[];
  quizzes: DemoQuiz[];
  sessions: DemoSession[];
  scores: DemoScore[];
}

const STORE_PATH = path.join(process.env.TEMP_DIR || '/tmp', 'uniquiz_store.json');

function seed(): DemoDb {
  const lecturers: DemoUser[] = [
    {
      id: 'lecturer-phuong-dtu',
      email: 'letthanhphuong3@dtu.edu.vn',
      student_code: null,
      full_name: 'ThS. Lê Thị Thanh Phương',
      role: 'lecturer',
      password: 'LeminhPhuc@2512',
    },
    {
      id: 'lecturer-phuong-gmail',
      email: 'phuong.lethanh797@gmail.com',
      student_code: null,
      full_name: 'ThS. Lê Thị Thanh Phương',
      role: 'lecturer',
      password: 'LeminhPhuc@2512',
    },
    {
      id: 'lecturer-uuid-1',
      email: 'giangvien@edu.vn',
      student_code: null,
      full_name: 'ThS. Lê Thị Thanh Phương',
      role: 'lecturer',
      password: 'GiangVien@2026',
    },
  ];

  // Nếu Giảng viên / Chủ hệ thống cấu hình tài khoản riêng trong file .env.local
  if (process.env.OWNER_EMAIL) {
    const ownerEmail = process.env.OWNER_EMAIL.trim().toLowerCase();
    const existing = lecturers.find((l) => l.email === ownerEmail);
    if (existing) {
      existing.password = process.env.OWNER_PASSWORD || existing.password;
      existing.full_name = process.env.OWNER_NAME || existing.full_name;
    } else {
      lecturers.unshift({
        id: 'owner-uuid-custom',
        email: ownerEmail,
        student_code: null,
        full_name: process.env.OWNER_NAME || 'ThS. Lê Thị Thanh Phương',
        role: 'lecturer',
        password: process.env.OWNER_PASSWORD || 'LeminhPhuc@2512',
      });
    }
  }

  return {
    users: [...lecturers],
    classes: [],
    enrollments: [],
    quizzes: [],
    sessions: [],
    scores: [],
  };
}

// Giữ qua các lần hot-reload của Next dev server
const globalStore = globalThis as unknown as { __uniquizDemoDb?: DemoDb };

export function saveDemoDb(): void {
  try {
    if (globalStore.__uniquizDemoDb) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(globalStore.__uniquizDemoDb, null, 2), 'utf8');
    }
  } catch (e) {
    // Bỏ qua lỗi ghi đĩa trong môi trường hạn chế
  }
}

export function loadDemoDb(): DemoDb | null {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.classes)) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function demoDb(): DemoDb {
  if (!globalStore.__uniquizDemoDb) {
    const fromDisk = loadDemoDb();
    if (fromDisk) {
      globalStore.__uniquizDemoDb = fromDisk;
    } else {
      globalStore.__uniquizDemoDb = seed();
      saveDemoDb();
    }
  }
  return globalStore.__uniquizDemoDb;
}

/** Ngày sinh -> chuỗi mật khẩu DDMMYYYY */
export function dobToPassword(isoDate: string): string {
  if (!isoDate) return '';
  const str = String(isoDate).trim();

  // 1. Dạng YYYY-MM-DD hoặc YYYY/MM/DD
  const mIso = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (mIso) {
    const [, yyyy, mm, dd] = mIso;
    return `${dd.padStart(2, '0')}${mm.padStart(2, '0')}${yyyy}`;
  }

  // 2. Dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const mDmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (mDmy) {
    const [, dd, mm, yyyy] = mDmy;
    return `${dd.padStart(2, '0')}${mm.padStart(2, '0')}${yyyy}`;
  }

  // 3. Chuỗi 8 chữ số thuần tuý
  const digits = str.replace(/\D/g, '');
  if (digits.length === 8) {
    // Nếu bắt đầu bằng 19xx hoặc 20xx thì là YYYYMMDD -> đổi về DDMMYYYY
    if (/^(19|20)\d{6}$/.test(digits)) {
      return `${digits.slice(6, 8)}${digits.slice(4, 6)}${digits.slice(0, 4)}`;
    }
    return digits;
  }

  // 4. Fallback Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}${mm}${d.getUTCFullYear()}`;
  }

  return '';
}
