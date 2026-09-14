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
import { createDefaultMidtermQuiz } from '@/lib/classStore';

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
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'long_answer' | 'essay';
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
  class_schedules?: Record<string, { class_id: string; start_at: string; end_at: string; access_code?: string | null; is_active?: boolean }>;
  start_at: string;
  end_at: string;
  is_active: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  prevent_previous?: boolean;
  questions_per_student?: number;
  section_sampling?: {
    multiple_choice?: number;
    short_answer?: number;
    long_answer?: number;
  } | null;
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
  answers?: {
    question_id: string;
    option_id?: string | null;
    answer_text?: string;
    score_awarded?: number;
    feedback?: string;
    is_correct?: boolean;
  }[];
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
      question_text: 'What is the primary role of Sales and Operations Planning (S&OP) in modern supply chain management?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 0,
      options: [
        { id: 'c3-q1-a', question_id: 'c3-q1', option_text: 'Balancing market demand forecasts with manufacturing capacity and operational resources', is_correct: true, order_index: 0 },
        { id: 'c3-q1-b', question_id: 'c3-q1', option_text: 'Maximizing buffer inventories across all downstream distribution centers', is_correct: false, order_index: 1 },
        { id: 'c3-q1-c', question_id: 'c3-q1', option_text: 'Strictly cutting short-term labor costs without regard to order fulfillment rates', is_correct: false, order_index: 2 },
        { id: 'c3-q1-d', question_id: 'c3-q1', option_text: 'Managing customs clearance documentation and international tariffs', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q2',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'In aggregate operations planning, which of the following is the key characteristic of a Chase Demand strategy?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 1,
      options: [
        { id: 'c3-q2-a', question_id: 'c3-q2', option_text: 'Adjusting production rates and workforce size period-by-period to match actual demand fluctuations', is_correct: true, order_index: 0 },
        { id: 'c3-q2-b', question_id: 'c3-q2', option_text: 'Maintaining a constant output rate regardless of seasonality or market swings', is_correct: false, order_index: 1 },
        { id: 'c3-q2-c', question_id: 'c3-q2', option_text: 'Relying exclusively on third-party subcontractors while keeping workforce idle', is_correct: false, order_index: 2 },
        { id: 'c3-q2-d', question_id: 'c3-q2', option_text: 'Accumulating finished goods inventory during peak seasons', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q3',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'Where does the Bullwhip Effect typically produce the most severe demand distortion and variance amplification?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 2,
      options: [
        { id: 'c3-q3-a', question_id: 'c3-q3', option_text: 'Tier-1 and Tier-2 raw material suppliers furthest upstream in the supply chain', is_correct: true, order_index: 0 },
        { id: 'c3-q3-b', question_id: 'c3-q3', option_text: 'End-consumer point of sale furthest downstream', is_correct: false, order_index: 1 },
        { id: 'c3-q3-c', question_id: 'c3-q3', option_text: 'Direct brick-and-mortar retail outlets', is_correct: false, order_index: 2 },
        { id: 'c3-q3-d', question_id: 'c3-q3', option_text: 'Local last-mile parcel couriers', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q4',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'What is the core principle of a Level Production strategy in aggregate planning?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 3,
      options: [
        { id: 'c3-q4-a', question_id: 'c3-q4', option_text: 'Maintaining a stable production rate and constant workforce, absorbing demand variance using inventory or backlogs', is_correct: true, order_index: 0 },
        { id: 'c3-q4-b', question_id: 'c3-q4', option_text: 'Hiring and laying off temporary workers on a weekly basis', is_correct: false, order_index: 1 },
        { id: 'c3-q4-c', question_id: 'c3-q4', option_text: 'Eliminating all safety stock and intermediate work-in-progress inventories completely', is_correct: false, order_index: 2 },
        { id: 'c3-q4-d', question_id: 'c3-q4', option_text: 'Shutting down manufacturing plants during high-demand quarters', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c3-q5',
      quiz_id: 'quiz-tb-1789133680207',
      question_text: 'What is the primary objective of Integrated Operations Planning?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 4,
      options: [
        { id: 'c3-q5-a', question_id: 'c3-q5', option_text: 'Synchronizing strategic business, financial, and operational supply chain goals into a unified execution plan', is_correct: true, order_index: 0 },
        { id: 'c3-q5-b', question_id: 'c3-q5', option_text: 'Isolating marketing forecasts completely from manufacturing schedule data', is_correct: false, order_index: 1 },
        { id: 'c3-q5-c', question_id: 'c3-q5', option_text: 'Focusing exclusively on reducing accounts payable processing cycles', is_correct: false, order_index: 2 },
        { id: 'c3-q5-d', question_id: 'c3-q5', option_text: 'Maximizing long-term warehouse real-estate acquisition', is_correct: false, order_index: 3 },
      ],
    },
  ];

  const defaultQuiz: DemoQuiz = {
    id: 'quiz-tb-1789133680207',
    title: 'Quiz - 05',
    description: 'Chapter 3: Integrated Operations Planning (p2). Time limit: 5 minutes, 5 randomized questions. No backtracking, immediate 0 score if tab switching is detected.',
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

  const midterm = createDefaultMidtermQuiz();
  const midtermQuiz: DemoQuiz = {
    id: 'midterm-scm-2026',
    title: 'Midterm',
    description: midterm.description || '',
    time_limit_minutes: 60,
    is_published: true,
    show_results: false,
    passcode: 'LOG888',
    passcode_expires_at: null,
    class_ids: ['class-scm201-i'],
    class_schedules: {
      'class-scm201-i': {
        class_id: 'class-scm201-i',
        start_at: '2026-09-13T17:59',
        end_at: '2026-09-20T17:59',
        access_code: 'LOG888',
        is_active: true,
      },
    },
    start_at: '2026-09-13T17:59:00.000Z',
    end_at: '2026-09-20T17:59:00.000Z',
    is_active: true,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 24,
    section_sampling: {
      multiple_choice: 20,
      short_answer: 3,
      long_answer: 1,
    },
    questions: (midterm.questions || []) as DemoQuestion[],
  };

  return {
    users: [...lecturers, defaultStudent],
    classes: [defaultClass],
    enrollments: [{ class_id: 'class-scm201-i', student_id: 'st-123456789' }],
    quizzes: [defaultQuiz, midtermQuiz],
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
  const fromDisk = loadDemoDb();
  if (!globalStore.__uniquizDemoDb) {
    if (fromDisk && Array.isArray(fromDisk.quizzes)) {
      globalStore.__uniquizDemoDb = fromDisk;
    } else {
      globalStore.__uniquizDemoDb = seed();
      saveDemoDb();
    }
  } else if (fromDisk && Array.isArray(fromDisk.quizzes)) {
    // Luôn đồng bộ danh sách đề thi theo đúng file lưu trữ trên đĩa
    globalStore.__uniquizDemoDb.quizzes = fromDisk.quizzes;
    if (Array.isArray(fromDisk.classes)) {
      globalStore.__uniquizDemoDb.classes = fromDisk.classes;
    }
    if (Array.isArray(fromDisk.enrollments)) {
      globalStore.__uniquizDemoDb.enrollments = fromDisk.enrollments;
    }
  }

  // Tự động nâng cấp / đồng bộ cấu hình nếu các đề thi thiếu section_sampling hoặc passcode
  const db = globalStore.__uniquizDemoDb!;
  let modified = false;

  // 1. Luôn loại bỏ vĩnh viễn đề thi cũ đã bị xoá: 'quiz-midterm-logistics' / 'Đề Thi Giữa Kỳ (Midterm Exam)'
  const beforeLen = db.quizzes.length;
  db.quizzes = db.quizzes.filter((q) => q.id !== 'quiz-midterm-logistics' && !q.title.includes('Đề Thi Giữa Kỳ (Midterm Exam)'));
  if (db.quizzes.length !== beforeLen) {
    modified = true;
  }

  // 2. Bảo đảm đề thi 'Midterm' mà Giảng viên giữ luôn luôn có mặt và đầy đủ câu hỏi
  const midQuizIdx = db.quizzes.findIndex((q) => q.title.trim().toLowerCase() === 'midterm' || q.id === 'midterm-scm-2026');
  const defaultMidterm = createDefaultMidtermQuiz();
  if (midQuizIdx >= 0) {
    const existingMid = db.quizzes[midQuizIdx];
    if (!existingMid.questions || existingMid.questions.length === 0) {
      existingMid.questions = (defaultMidterm.questions || []) as DemoQuestion[];
      existingMid.questions_per_student = 24;
      existingMid.section_sampling = {
        multiple_choice: 20,
        short_answer: 3,
        long_answer: 1,
      };
      existingMid.passcode = existingMid.passcode || 'LOG888';
      modified = true;
    }
  } else {
    const midQuiz: DemoQuiz = {
      id: 'midterm-scm-2026',
      title: 'Midterm',
      description: defaultMidterm.description || '',
      time_limit_minutes: 60,
      is_published: true,
      show_results: false,
      passcode: 'LOG888',
      passcode_expires_at: null,
      class_ids: ['class-scm201-i'],
      class_schedules: {
        'class-scm201-i': {
          class_id: 'class-scm201-i',
          start_at: '2026-09-13T17:59',
          end_at: '2026-09-20T17:59',
          access_code: 'LOG888',
          is_active: true,
        },
      },
      start_at: '2026-09-13T17:59:00.000Z',
      end_at: '2026-09-20T17:59:00.000Z',
      is_active: true,
      shuffle_questions: true,
      shuffle_options: true,
      prevent_previous: true,
      questions_per_student: 24,
      section_sampling: {
        multiple_choice: 20,
        short_answer: 3,
        long_answer: 1,
      },
      questions: (defaultMidterm.questions || []) as DemoQuestion[],
    };
    db.quizzes.push(midQuiz);
    modified = true;
  }

  for (const q of db.quizzes) {
    const isMidterm = q.id === 'midterm-scm-2026' || q.title.toLowerCase().includes('midterm');
    const hasSpecial = q.questions?.some((x) => x.question_type === 'short_answer' || x.question_type === 'long_answer');
    if (isMidterm || hasSpecial) {
      const mcCount = q.questions?.filter((x) => x.question_type === 'multiple_choice' || x.question_type === 'true_false').length || 25;
      const shortCount = q.questions?.filter((x) => x.question_type === 'short_answer').length || 8;
      const longCount = q.questions?.filter((x) => x.question_type === 'long_answer').length || 3;
      const defaultSamplingMc = isMidterm ? 20 : mcCount;
      const defaultSamplingShort = isMidterm ? 3 : shortCount;
      const defaultSamplingLong = isMidterm ? 1 : longCount;
      const totalSample = defaultSamplingMc + defaultSamplingShort + defaultSamplingLong;

      if (!q.passcode) {
        q.passcode = 'LOG888';
        modified = true;
      }
      if (!q.section_sampling) {
        q.section_sampling = {
          multiple_choice: defaultSamplingMc,
          short_answer: defaultSamplingShort,
          long_answer: defaultSamplingLong,
        };
        modified = true;
      }
      if (!q.questions_per_student || q.questions_per_student <= 0) {
        q.questions_per_student = isMidterm ? 24 : totalSample;
        modified = true;
      }

      // Bổ sung sơ đồ minh họa cho câu hỏi nếu thiếu
      const defaultMidterm = createDefaultMidtermQuiz();
      if (q.questions) {
        for (const quest of q.questions) {
          if (!quest.image_url) {
            const match = defaultMidterm.questions?.find((d) => d.id === quest.id);
            if (match?.image_url) {
              quest.image_url = match.image_url;
              modified = true;
            }
          }
        }
      }
    }
  }

  if (modified) {
    saveDemoDb();
  }

  return db;
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
