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

  const defaultStudent: DemoUser = {
    id: 'st-123456789',
    student_code: '123456789',
    full_name: 'Sinh Viên 123456789',
    email: '123456789@student.university.edu.vn',
    role: 'student',
    date_of_birth: '2004-01-15',
  };

  const defaultClass = {
    id: 'class-scm201-i',
    code: 'SCM201 I',
    name: 'Introduction to Logistics & SCM',
    semester: 'HKI (2026 - 2027)',
  };

  const chapter3Questions: DemoQuestion[] = [
    {
      id: 'c3-q1',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Khái niệm S&OP (Sales and Operations Planning) trong chuỗi cung ứng đóng vai trò chủ đạo nào?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 0,
      options: [
        { id: 'c3-q1-a', question_id: 'c3-q1', option_text: 'Cân bằng giữa dự báo nhu cầu thị trường và năng lực sản xuất, cung ứng', is_correct: true, order_index: 0 },
        { id: 'c3-q1-b', question_id: 'c3-q1', option_text: 'Tối đa hóa lượng hàng tồn kho dự trữ tại mọi điểm', is_correct: false, order_index: 1 },
        { id: 'c3-q1-c', question_id: 'c3-q1', option_text: 'Chỉ tập trung vào việc cắt giảm chi phí nhân sự', is_correct: false, order_index: 2 },
        { id: 'c3-q1-d', question_id: 'c3-q1', option_text: 'Quản lý các thủ tục hải quan xuất nhập khẩu', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q2',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Trong hoạch định tổng hợp (Aggregate Planning), chiến lược đuổi theo nhu cầu (Chase Strategy) có đặc điểm nào?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 1,
      options: [
        { id: 'c3-q2-a', question_id: 'c3-q2', option_text: 'Điều chỉnh sản lượng sản xuất theo từng thời kỳ khớp sát với nhu cầu thực tế', is_correct: true, order_index: 0 },
        { id: 'c3-q2-b', question_id: 'c3-q2', option_text: 'Giữ nguyên mức sản xuất cố định trong suốt cả năm', is_correct: false, order_index: 1 },
        { id: 'c3-q2-c', question_id: 'c3-q2', option_text: 'Luôn sử dụng tối đa nhà thầu phụ bất kể nhu cầu', is_correct: false, order_index: 2 },
        { id: 'c3-q2-d', question_id: 'c3-q2', option_text: 'Không quan tâm đến chi phí tuyển dụng hay sa thải nhân công', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q3',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Bullwhip Effect (Hiệu ứng chiếc roi da) có xu hướng làm méo mó thông tin nhu cầu nghiêm trọng nhất ở mắt xích nào?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 2,
      options: [
        { id: 'c3-q3-a', question_id: 'c3-q3', option_text: 'Nhà cung ứng nguyên vật liệu cấp 1 và cấp 2 (thượng nguồn)', is_correct: true, order_index: 0 },
        { id: 'c3-q3-b', question_id: 'c3-q3', option_text: 'Khách hàng tiêu dùng cuối cùng (hạ nguồn)', is_correct: false, order_index: 1 },
        { id: 'c3-q3-c', question_id: 'c3-q3', option_text: 'Cửa hàng bán lẻ trực tiếp', is_correct: false, order_index: 2 },
        { id: 'c3-q3-d', question_id: 'c3-q3', option_text: 'Đơn vị chuyển phát nhanh chặng cuối', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q4',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Chiến lược sản xuất theo mức độ bằng phẳng (Level Strategy) ưu tiên điều gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 3,
      options: [
        { id: 'c3-q4-a', question_id: 'c3-q4', option_text: 'Duy trì tốc độ sản xuất và lực lượng lao động ổn định, dùng hàng tồn kho làm đệm', is_correct: true, order_index: 0 },
        { id: 'c3-q4-b', question_id: 'c3-q4', option_text: 'Thay đổi liên tục số lượng nhân công mỗi ngày', is_correct: false, order_index: 1 },
        { id: 'c3-q4-c', question_id: 'c3-q4', option_text: 'Xóa bỏ hoàn toàn kho đệm tồn kho', is_correct: false, order_index: 2 },
        { id: 'c3-q4-d', question_id: 'c3-q4', option_text: 'Đóng cửa nhà máy vào mùa cao điểm', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q5',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Mục tiêu cốt lõi của hoạt động Integrated Operations Planning (Hoạch định vận hành tích hợp) là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 4,
      options: [
        { id: 'c3-q5-a', question_id: 'c3-q5', option_text: 'Đồng bộ hóa mục tiêu kinh doanh, tài chính và vận hành chuỗi cung ứng trên một kế hoạch thống nhất', is_correct: true, order_index: 0 },
        { id: 'c3-q5-b', question_id: 'c3-q5', option_text: 'Phân chia riêng rẽ dữ liệu giữa phòng bán hàng và phòng sản xuất', is_correct: false, order_index: 1 },
        { id: 'c3-q5-c', question_id: 'c3-q5', option_text: 'Chỉ tập trung tối ưu hóa hoạt động của bộ phận kế toán', is_correct: false, order_index: 2 },
        { id: 'c3-q5-d', question_id: 'c3-q5', option_text: 'Tăng thời gian hoàn vốn đầu tư của dự án', is_correct: false, order_index: 3 },
      ],
    },
  ];

  const defaultQuiz: DemoQuiz = {
    id: 'quiz-tb-1789133680207',
    title: 'Quiz - 05',
    description: 'Pop Quiz thuộc Chapter 3: Integrated Operations Planning (p2). Thời gian làm bài 5 phút, 5 câu hỏi ngẫu nhiên. Sinh viên không thể xem lại câu hỏi trước, và sẽ tính 0 điểm nếu hệ thống phát hiện sinh viên chuyển màn hình.',
    time_limit_minutes: 5,
    is_published: true,
    show_results: false,
    passcode: null,
    passcode_expires_at: null,
    class_ids: ['class-scm201-i'],
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    is_active: true,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 5,
    questions: chapter3Questions,
  };

  const aliasQuiz: DemoQuiz = {
    ...defaultQuiz,
    id: 'quiz-05-scm',
  };

  return {
    users: [...lecturers, defaultStudent],
    classes: [defaultClass],
    enrollments: [{ class_id: 'class-scm201-i', student_id: 'st-123456789' }],
    quizzes: [defaultQuiz, aliasQuiz],
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
    if (fromDisk && fromDisk.quizzes && fromDisk.quizzes.length > 0) {
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
