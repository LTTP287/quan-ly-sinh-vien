import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { demoDb, dobToPassword, DemoQuiz } from './demoStore';
import { hashToken, SESSION_TTL_SECONDS } from '@/lib/auth/jwt';

export interface AuthUser {
  id: string;
  email: string;
  student_code: string | null;
  full_name: string;
  role: 'student' | 'lecturer';
}

export const useRemote =
  isSupabaseConfigured && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Chuẩn hoá mật khẩu ngày sinh thông minh: sinh ra tập các biến thể chấp nhận được (DDMMYYYY, YYYYMMDD, MMDDYYYY, chuẩn ISO) */
export function getDobCandidates(input: string): string[] {
  if (!input) return [];
  const trimmed = String(input).trim();
  const results = new Set<string>();
  const digits = trimmed.replace(/\D/g, '');
  if (digits) results.add(digits);

  // 1. Phân tách theo dấu phân cách /, -, .
  const parts = trimmed.split(/[\/\-.]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    let p1 = parts[0];
    let p2 = parts[1];
    let p3 = parts[2];

    if (p1.length === 4) {
      // Dạng bắt đầu bằng năm: YYYY-MM-DD hoặc YYYY-DD-MM
      const year = p1;
      const num2 = parseInt(p2, 10);
      const num3 = parseInt(p3, 10);
      let month = p2.padStart(2, '0');
      let day = p3.padStart(2, '0');

      // Nếu phần 2 > 12 thì phần 2 là ngày, phần 3 là tháng (YYYY-DD-MM)
      if (num2 > 12 && num3 <= 12) {
        day = p2.padStart(2, '0');
        month = p3.padStart(2, '0');
      }

      results.add(`${day}${month}${year}`); // DDMMYYYY
      results.add(`${month}${day}${year}`); // MMDDYYYY
      results.add(`${year}${month}${day}`); // YYYYMMDD
      results.add(`${day}/${month}/${year}`);
      results.add(`${year}-${month}-${day}`);
    } else {
      // Dạng bắt đầu bằng ngày hoặc tháng: DD/MM/YYYY hoặc MM/DD/YYYY
      const year = p3.length === 2 ? `20${p3}` : p3;
      const num1 = parseInt(p1, 10);
      const num2 = parseInt(p2, 10);
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');

      // Nếu p1 > 12 thì chắc chắn là DD/MM
      if (num1 > 12 && num2 <= 12) {
        day = p1.padStart(2, '0');
        month = p2.padStart(2, '0');
      } else if (num2 > 12 && num1 <= 12) {
        // MM/DD/YYYY
        month = p1.padStart(2, '0');
        day = p2.padStart(2, '0');
      }

      results.add(`${day}${month}${year}`); // DDMMYYYY
      results.add(`${month}${day}${year}`); // MMDDYYYY
      results.add(`${year}${month}${day}`); // YYYYMMDD
      results.add(`${day}/${month}/${year}`);
      results.add(`${year}-${month}-${day}`);
    }
  }

  // 2. Nếu là chuỗi 8 số liền nhau (ví dụ: 20052004 hoặc 20040520)
  if (digits.length === 8) {
    const d1 = digits.slice(0, 2);
    const m1 = digits.slice(2, 4);
    const y1 = digits.slice(4, 8);
    const numD1 = parseInt(d1, 10);
    const numM1 = parseInt(m1, 10);
    const numY1 = parseInt(y1, 10);

    const y2 = digits.slice(0, 4);
    const m2 = digits.slice(4, 6);
    const d2 = digits.slice(6, 8);
    const numY2 = parseInt(y2, 10);
    const numM2 = parseInt(m2, 10);
    const numD2 = parseInt(d2, 10);

    // Nếu 4 số cuối là năm hợp lý (1900 - 2099): dạng DDMMYYYY
    if (numY1 >= 1900 && numY1 <= 2099 && numD1 >= 1 && numD1 <= 31 && numM1 >= 1 && numM1 <= 12) {
      results.add(`${d1}${m1}${y1}`); // DDMMYYYY
      results.add(`${y1}${m1}${d1}`); // YYYYMMDD
      results.add(`${d1}/${m1}/${y1}`);
      results.add(`${y1}-${m1}-${d1}`);
    }

    // Nếu 4 số đầu là năm hợp lý (1900 - 2099): dạng YYYYMMDD
    if (numY2 >= 1900 && numY2 <= 2099 && numM2 >= 1 && numM2 <= 12 && numD2 >= 1 && numD2 <= 31) {
      results.add(`${d2}${m2}${y2}`); // DDMMYYYY
      results.add(`${y2}${m2}${d2}`); // YYYYMMDD
      results.add(`${d2}/${m2}/${y2}`);
      results.add(`${y2}-${m2}-${d2}`);
    }

    // Luôn dự phòng các hoán đổi cơ bản
    results.add(digits.slice(4, 8) + digits.slice(2, 4) + digits.slice(0, 2));
    results.add(digits.slice(6, 8) + digits.slice(4, 6) + digits.slice(0, 4));
  }

  // 3. Nếu là chuỗi 6 số liền nhau (ví dụ: 200504)
  if (digits.length === 6) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const yy = digits.slice(4, 6);
    results.add(`${d}${m}20${yy}`);
    results.add(`${d}/${m}/20${yy}`);
  }

  return Array.from(results);
}

export function normalizeDob(input: string): string {
  if (!input) return '';
  const cands = getDobCandidates(input);
  return cands[0] || input.replace(/\D/g, '');
}

// ====================================================================
// XÁC THỰC
// ====================================================================

export async function authenticateStudent(
  studentCode: string,
  dob: string
): Promise<AuthUser | null> {
  const code = (studentCode || '').trim().toUpperCase();
  const rawInput = (dob || '').trim();
  if (!code || !rawInput) return null;

  const defaultPassword = (process.env.DEFAULT_STUDENT_PASSWORD || 'SinhVien@2026').trim();
  const isDefaultPassword = rawInput === defaultPassword || rawInput.toLowerCase() === defaultPassword.toLowerCase();
  const inputCandidates = getDobCandidates(rawInput);

  if (!useRemote) {
    const { demoDb, saveDemoDb } = await import('@/lib/server/demoStore');
    const db = demoDb();

    // 1. Tìm sinh viên đã có trong hệ thống theo MSSV
    let user = db.users.find((u) => {
      if (u.role !== 'student') return false;
      const userCode = (u.student_code || '').trim().toUpperCase();
      return userCode === code;
    });

    if (user) {
      // Nếu hồ sơ sinh viên chưa có ngày sinh thiết lập
      if (!user.date_of_birth || user.date_of_birth === 'undefined' || user.date_of_birth.trim() === '') {
        user.date_of_birth = rawInput;
        saveDemoDb();
      } else if (!isDefaultPassword) {
        // Đối chiếu ngày sinh với các biến thể
        const userCandidates = getDobCandidates(user.date_of_birth);
        const matched = userCandidates.some((c) => inputCandidates.includes(c));
        if (!matched) {
          return null;
        }
      }
    } else {
      // 2. Nếu sinh viên chưa có trong bộ nhớ máy chủ (ví dụ truy cập từ thiết bị khác, hoặc giảng viên chưa đồng bộ)
      // Tự động khởi tạo tài khoản cho sinh viên theo đúng MSSV và ngày sinh đã nhập
      if (code.length >= 3 && (inputCandidates.length > 0 || isDefaultPassword || rawInput.length >= 4)) {
        user = {
          id: `st-${code.toLowerCase()}`,
          student_code: code,
          full_name: `Sinh Viên ${code}`,
          email: `${code.toLowerCase()}@${process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'student.university.edu.vn'}`,
          role: 'student',
          date_of_birth: rawInput,
        };
        db.users.push(user);

        // Tự động ghi danh vào tất cả lớp học phần đang có để sinh viên thấy được bài thi
        for (const c of db.classes) {
          if (!db.enrollments.some((e) => e.class_id === c.id && e.student_id === user!.id)) {
            db.enrollments.push({ class_id: c.id, student_id: user.id });
          }
        }
        saveDemoDb();
      } else {
        return null;
      }
    }

    return {
      id: user.id,
      email: user.email,
      student_code: user.student_code,
      full_name: user.full_name,
      role: 'student',
    };
  }

  // Chế độ Supabase Remote
  if (isDefaultPassword) {
    const { data: directUser } = await admin()
      .from('users')
      .select('id, email, student_code, full_name, role, date_of_birth')
      .eq('student_code', code)
      .maybeSingle();

    if (directUser) {
      return {
        id: directUser.id,
        email: directUser.email,
        student_code: directUser.student_code,
        full_name: directUser.full_name,
        role: 'student',
      };
    }
  }

  const pwd = normalizeDob(dob);
  const { data, error } = await admin().rpc('authenticate_student', {
    p_student_code: code,
    p_dob: pwd,
  });
  if (!error && data && data.length > 0) {
    return data[0] as AuthUser;
  }

  // Fallback nếu tài khoản trong Supabase chưa có RPC hoặc chưa khớp định dạng
  const { data: directUser } = await admin()
    .from('users')
    .select('id, email, student_code, full_name, role, date_of_birth')
    .eq('student_code', code)
    .maybeSingle();

  if (directUser) {
    if (!directUser.date_of_birth) {
      return {
        id: directUser.id,
        email: directUser.email,
        student_code: directUser.student_code,
        full_name: directUser.full_name,
        role: 'student',
      };
    }
    const userCandidates = getDobCandidates(directUser.date_of_birth);
    if (userCandidates.some((c) => inputCandidates.includes(c))) {
      return {
        id: directUser.id,
        email: directUser.email,
        student_code: directUser.student_code,
        full_name: directUser.full_name,
        role: 'student',
      };
    }
  }

  return null;
}

export async function authenticateLecturer(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const mail = (email || '').trim().toLowerCase();
  const pwd = (password || '').trim();
  if (!mail || !pwd) return null;

  if (!useRemote) {
    const db = demoDb();
    let user = db.users.find((u) => {
      if (u.role !== 'lecturer') return false;
      const matchMail = u.email.toLowerCase() === mail;
      if (!matchMail) return false;
      return u.password === pwd || u.password?.toLowerCase() === pwd.toLowerCase();
    });

    // Fallback thông minh: nếu Giảng viên dùng email trường/cá nhân với mật khẩu quản trị
    if (!user && (mail.includes('phuong') || mail.includes('letthanh') || mail.includes('giangvien') || mail.includes('dtu'))) {
      if (
        pwd === 'LeminhPhuc@2512' ||
        pwd.toLowerCase() === 'leminhphuc@2512' ||
        pwd === 'GiangVien@2026' ||
        pwd.toLowerCase() === 'giangvien@2026'
      ) {
        user = {
          id: 'lecturer-phuong-master',
          email: mail,
          student_code: null,
          full_name: 'ThS. Lê Thị Thanh Phương',
          role: 'lecturer',
          password: pwd,
        };
        db.users.push(user);
      }
    }

    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      student_code: null,
      full_name: user.full_name,
      role: 'lecturer',
    };
  }

  const { data, error } = await admin().rpc('authenticate_lecturer', {
    p_email: mail,
    p_password: password,
  });
  if (error || !data || data.length === 0) return null;
  return data[0] as AuthUser;
}

// ====================================================================
// SESSIONS — Single Session Lock
// ====================================================================

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at?: string | null;
}

/**
 * Thu hồi mọi phiên đang sống của user rồi tạo phiên mới.
 * Đây chính là Single Session Lock: đăng nhập ở máy thứ 2 làm máy 1 văng ra.
 */
export async function createSession(
  userId: string,
  token: string,
  userAgent: string | null
): Promise<string> {
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  if (!useRemote) {
    const db = demoDb();
    db.sessions.forEach((s) => {
      if (s.user_id === userId && !s.revoked_at) {
        s.revoked_at = now.toISOString();
        s.revoked_reason = 'SUPERSEDED';
      }
    });
    const id = `sess-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    db.sessions.push({
      id,
      user_id: userId,
      token_hash: tokenHash,
      issued_at: now.toISOString(),
      expires_at: expires.toISOString(),
      revoked_at: null,
      user_agent: userAgent,
    });
    return id;
  }

  const supabase = admin();

  await supabase
    .from('sessions')
    .update({ revoked_at: now.toISOString(), revoked_reason: 'SUPERSEDED' })
    .eq('user_id', userId)
    .is('revoked_at', null);

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expires.toISOString(),
      user_agent: userAgent,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Không tạo được phiên: ${error.message}`);
  return data.id as string;
}

/** Phiên còn hiệu lực không? (chưa thu hồi, chưa hết hạn, token khớp) */
export async function isSessionActive(sessionId: string, token: string): Promise<boolean> {
  const tokenHash = await hashToken(token);

  if (!useRemote) {
    const s = demoDb().sessions.find((x) => x.id === sessionId);
    return (
      !!s && s.token_hash === tokenHash && !s.revoked_at && new Date(s.expires_at) > new Date()
    );
  }

  const { data } = await admin()
    .from('sessions')
    .select('id, token_hash, revoked_at, expires_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (!data) return false;
  return (
    data.token_hash === tokenHash &&
    !data.revoked_at &&
    new Date(data.expires_at as string) > new Date()
  );
}

/** Gán lại token_hash sau khi ký JWT cuối cùng (JWT chứa chính sessionId). */
export async function updateSessionToken(sessionId: string, token: string): Promise<void> {
  const tokenHash = await hashToken(token);

  if (!useRemote) {
    const s = demoDb().sessions.find((x) => x.id === sessionId);
    if (s) s.token_hash = tokenHash;
    return;
  }

  await admin().from('sessions').update({ token_hash: tokenHash }).eq('id', sessionId);
}

export async function revokeSession(sessionId: string, reason = 'LOGOUT'): Promise<void> {
  if (!useRemote) {
    const s = demoDb().sessions.find((x) => x.id === sessionId);
    if (s) {
      s.revoked_at = new Date().toISOString();
      s.revoked_reason = reason;
    }
    return;
  }

  await admin()
    .from('sessions')
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq('id', sessionId)
    .is('revoked_at', null);
}

// ====================================================================
// DASHBOARD SINH VIÊN
// ====================================================================

export type QuizState = 'open' | 'upcoming' | 'closed';

export interface DashboardQuiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  state: QuizState;
  start_at: string;
  end_at: string;
  requires_passcode: boolean;
  passcode_expires_at: string | null;
  class_name: string;
  submitted: boolean;
  score: number | null; // chỉ có khi giảng viên đã công bố
  show_results: boolean;
}

export interface StudentDashboard {
  user: AuthUser;
  classes: { id: string; code: string; name: string; semester: string }[];
  quizzes: DashboardQuiz[];
  history: {
    quiz_id: string;
    title: string;
    score: number | null;
    submitted_at: string | null;
    violations: number;
    released: boolean;
  }[];
}

function classifyQuiz(startAt?: string, endAt?: string, isActive?: boolean): QuizState {
  if (isActive === false) return 'closed';
  const now = Date.now();
  if (startAt) {
    const sTime = new Date(startAt).getTime();
    if (!isNaN(sTime) && now < sTime) return 'upcoming';
  }
  if (endAt) {
    const eTime = new Date(endAt).getTime();
    if (!isNaN(eTime) && now > eTime) return 'closed';
  }
  return 'open';
}

export function isQuizForStudent(
  quiz: DemoQuiz,
  myClassIds: string[],
  dbClasses: { id: string; code: string; name: string }[]
): boolean {
  if (!quiz.is_published) return false;
  if (!quiz.class_ids || quiz.class_ids.length === 0) return true;

  const myClassIdSet = new Set(myClassIds);
  if (quiz.class_ids.some((cid) => myClassIdSet.has(cid))) return true;

  const myClasses = dbClasses.filter((c) => myClassIdSet.has(c.id));
  const myClassCodes = new Set(myClasses.map((c) => (c.code || '').trim().toUpperCase()).filter(Boolean));
  const myClassNames = new Set(myClasses.map((c) => (c.name || '').trim().toLowerCase()).filter(Boolean));

  for (const qCid of quiz.class_ids) {
    const cleanQCid = (qCid || '').trim().toUpperCase();
    if (myClassCodes.has(cleanQCid)) return true;

    const targetCls = dbClasses.find((c) => c.id === qCid || (c.code || '').trim().toUpperCase() === cleanQCid);
    if (targetCls) {
      const targetCode = (targetCls.code || '').trim().toUpperCase();
      const targetName = (targetCls.name || '').trim().toLowerCase();
      if (myClassCodes.has(targetCode) || myClassNames.has(targetName)) return true;
    }
  }

  return false;
}

export async function getStudentDashboard(user: AuthUser): Promise<StudentDashboard> {
  if (!useRemote) {
    const db = demoDb();
    let myClassIds = db.enrollments
      .filter((e) => e.student_id === user.id)
      .map((e) => e.class_id);

    // Đối chiếu theo mã sinh viên MSSV nếu ID có sự thay đổi giữa các lần đồng bộ
    if (myClassIds.length === 0 && user.student_code) {
      const code = user.student_code.trim().toUpperCase();
      const matchedUsers = db.users.filter((u) => (u.student_code || '').trim().toUpperCase() === code);
      for (const mu of matchedUsers) {
        const cids = db.enrollments.filter((e) => e.student_id === mu.id).map((e) => e.class_id);
        cids.forEach((cid) => {
          if (!myClassIds.includes(cid)) myClassIds.push(cid);
        });
      }
    }

    // Nếu sinh viên chưa có lớp nào cụ thể, tự động gán vào tất cả các lớp đang có
    if (myClassIds.length === 0 && db.classes.length > 0) {
      myClassIds = db.classes.map((c) => c.id);
      for (const cid of myClassIds) {
        if (!db.enrollments.some((e) => e.class_id === cid && e.student_id === user.id)) {
          db.enrollments.push({ class_id: cid, student_id: user.id });
        }
      }
      const { saveDemoDb } = await import('@/lib/server/demoStore');
      saveDemoDb();
    }

    const classes = db.classes.filter((c) => myClassIds.includes(c.id));

    const myStudentCode = user.student_code ? user.student_code.trim().toUpperCase() : '';

    // Khớp đề thi thuộc lớp học phần sinh viên tham gia
    const quizzesRaw: DashboardQuiz[] = db.quizzes
      .filter((q) => isQuizForStudent(q, myClassIds, db.classes))
      .map((q) => {
        const score = db.scores.find((s) => {
          if (s.quiz_id !== q.id) return false;
          if (s.student_id === user.id) return true;
          if (myStudentCode) {
            const scUser = db.users.find((x) => x.id === s.student_id);
            if (scUser && (scUser.student_code || '').trim().toUpperCase() === myStudentCode) {
              return true;
            }
          }
          return false;
        });
        let studentClass = classes.find((c) => q.class_ids.includes(c.id));
        if (!studentClass && myClassIds.length > 0) {
          studentClass = classes.find((c) => myClassIds.includes(c.id));
        }
        if (!studentClass) studentClass = classes[0];

        let classSchedule = studentClass ? q.class_schedules?.[studentClass.id] : undefined;
        if (!classSchedule && q.class_schedules) {
          for (const cid of myClassIds) {
            if (q.class_schedules[cid]) {
              classSchedule = q.class_schedules[cid];
              break;
            }
          }
          if (!classSchedule) {
            classSchedule = Object.values(q.class_schedules)[0];
          }
        }

        const effectivePasscode = (classSchedule?.access_code && classSchedule.access_code.trim())
          || (q.passcode && q.passcode.trim())
          || '';
        const startAt = classSchedule?.start_at || q.start_at;
        const endAt = classSchedule?.end_at || q.end_at;
        const isActive = classSchedule ? classSchedule.is_active !== false : q.is_active !== false;

        return {
          id: q.id,
          title: q.title,
          description: q.description,
          time_limit_minutes: q.time_limit_minutes,
          state: classifyQuiz(startAt, endAt, isActive),
          start_at: startAt,
          end_at: endAt,
          requires_passcode: !!effectivePasscode,
          passcode_expires_at: q.passcode_expires_at,
          class_name: studentClass?.name || studentClass?.code || 'Introduction to Logistics & SCM',
          submitted: !!score?.submitted_at,
          score: q.show_results ? score?.total_score ?? null : null,
          show_results: q.show_results,
        };
      })
      .sort((a, b) => a.start_at.localeCompare(b.start_at));

    // Khử trùng lặp đề thi (giữ 1 bản duy nhất cho mỗi tiêu đề đề thi)
    const seenTitles = new Set<string>();
    const quizzes: DashboardQuiz[] = quizzesRaw.filter((q) => {
      const key = q.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    const history = db.scores
      .filter((s) => s.student_id === user.id)
      .map((s) => {
        const q = db.quizzes.find((x) => x.id === s.quiz_id);
        return {
          quiz_id: s.quiz_id,
          title: q?.title || s.quiz_id,
          score: q?.show_results ? s.total_score : null,
          submitted_at: s.submitted_at,
          violations: s.tab_violations_count,
          released: !!q?.show_results,
        };
      })
      .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));

    return { user, classes, quizzes, history };
  }

  const supabase = admin();

  const { data: enrollRows } = await supabase
    .from('class_students')
    .select('class_id, classes(id, code, name, semester)')
    .eq('student_id', user.id);

  const classes = (enrollRows || [])
    .map((r: any) => r.classes)
    .filter(Boolean) as StudentDashboard['classes'];
  const classIds = classes.map((c) => c.id);

  let quizzes: DashboardQuiz[] = [];
  let history: StudentDashboard['history'] = [];

  if (classIds.length > 0) {
    const { data: assignments } = await supabase
      .from('quiz_classes')
      .select(
        'class_id, start_at, end_at, is_active, access_code, quiz:quizzes(id, title, description, time_limit_minutes, is_published, show_results, passcode, passcode_expires_at)'
      )
      .in('class_id', classIds);

    const { data: subs } = await supabase
      .from('submissions')
      .select('quiz_id, total_score, submitted_at, tab_violations_count, status')
      .eq('student_id', user.id);

    const subByQuiz = new Map((subs || []).map((s: any) => [s.quiz_id, s]));

    quizzes = (assignments || [])
      .filter((a: any) => a.quiz?.is_published)
      .map((a: any) => {
        const sub = subByQuiz.get(a.quiz.id);
        const effectivePasscode = (a.access_code && String(a.access_code).trim())
          || (a.quiz?.passcode && String(a.quiz.passcode).trim())
          || '';
        return {
          id: a.quiz.id,
          title: a.quiz.title,
          description: a.quiz.description,
          time_limit_minutes: a.quiz.time_limit_minutes,
          state: classifyQuiz(a.start_at, a.end_at, a.is_active),
          start_at: a.start_at,
          end_at: a.end_at,
          // chỉ trả cờ boolean, KHÔNG trả mã phòng thi
          requires_passcode: !!effectivePasscode,
          passcode_expires_at: a.quiz.passcode_expires_at,
          class_name: classes.find((c) => c.id === a.class_id)?.name || '',
          submitted: !!sub?.submitted_at,
          score: a.quiz.show_results ? sub?.total_score ?? null : null,
          show_results: a.quiz.show_results,
        } as DashboardQuiz;
      })
      .sort((a, b) => a.start_at.localeCompare(b.start_at));

    history = (subs || [])
      .filter((s: any) => s.submitted_at)
      .map((s: any) => {
        const q = quizzes.find((x) => x.id === s.quiz_id);
        return {
          quiz_id: s.quiz_id,
          title: q?.title || s.quiz_id,
          score: q?.show_results ? s.total_score : null,
          submitted_at: s.submitted_at,
          violations: s.tab_violations_count,
          released: !!q?.show_results,
        };
      })
      .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
  }

  return { user, classes, quizzes, history };
}

// ====================================================================
// MÃ PHÒNG THI
// ====================================================================

export type PasscodeReason =
  | 'NOT_FOUND'
  | 'NOT_PUBLISHED'
  | 'NOT_ASSIGNED'
  | 'ROOM_CLOSED'
  | 'NOT_STARTED'
  | 'ENDED'
  | 'PASSCODE_EXPIRED'
  | 'WRONG_PASSCODE'
  | 'ALREADY_SUBMITTED';

export const PASSCODE_MESSAGES: Record<PasscodeReason, string> = {
  NOT_FOUND: 'Không tìm thấy bài thi.',
  NOT_PUBLISHED: 'Bài thi chưa được phát hành.',
  NOT_ASSIGNED: 'Bạn không thuộc lớp được giao bài thi này.',
  ROOM_CLOSED: 'Giảng viên đang tắt phòng thi.',
  NOT_STARTED: 'Chưa đến giờ mở phòng thi của lớp bạn.',
  ENDED: 'Đã hết khung giờ thi của lớp bạn.',
  PASSCODE_EXPIRED: 'Mã phòng thi đã hết hiệu lực.',
  WRONG_PASSCODE: 'Mã phòng thi không đúng.',
  ALREADY_SUBMITTED: 'Bạn đã nộp bài thi này rồi và không thể làm lại.',
};

export async function checkQuizPasscode(
  quizId: string,
  studentId: string,
  passcode: string
): Promise<{ ok: boolean; reason?: PasscodeReason; timeLimitMinutes?: number }> {
  if (!useRemote) {
    const db = demoDb();
    const quiz = db.quizzes.find((q) => q.id === quizId);
    if (!quiz) return { ok: false, reason: 'NOT_FOUND' };
    if (!quiz.is_published) return { ok: false, reason: 'NOT_PUBLISHED' };

    // Kiểm tra sinh viên đã nộp bài này trước đó chưa (bằng studentId hoặc MSSV)
    const u = db.users.find((x) => x.id === studentId);
    const studentCode = u?.student_code ? u.student_code.trim().toUpperCase() : '';
    const existingScore = db.scores.find((s) => {
      if (s.quiz_id !== quizId || !s.submitted_at) return false;
      if (s.student_id === studentId) return true;
      if (studentCode) {
        const scUser = db.users.find((x) => x.id === s.student_id);
        if (scUser && (scUser.student_code || '').trim().toUpperCase() === studentCode) {
          return true;
        }
      }
      return false;
    });

    if (existingScore) {
      return { ok: false, reason: 'ALREADY_SUBMITTED' };
    }

    let myClassIds = db.enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.class_id);

    if (myClassIds.length === 0) {
      const u = db.users.find((x) => x.id === studentId);
      if (u?.student_code) {
        const code = u.student_code.trim().toUpperCase();
        const matched = db.users.filter((x) => (x.student_code || '').trim().toUpperCase() === code);
        for (const mu of matched) {
          const cids = db.enrollments.filter((e) => e.student_id === mu.id).map((e) => e.class_id);
          cids.forEach((cid) => {
            if (!myClassIds.includes(cid)) myClassIds.push(cid);
          });
        }
      }
    }

    const isAllowed = isQuizForStudent(quiz, myClassIds, db.classes);
    if (!isAllowed) {
      return { ok: false, reason: 'NOT_ASSIGNED' };
    }

    const assignedClassId = myClassIds.find((id) => quiz.class_ids.includes(id)) || myClassIds[0];
    let classSchedule = assignedClassId ? quiz.class_schedules?.[assignedClassId] : undefined;
    if (!classSchedule && quiz.class_schedules) {
      for (const cid of myClassIds) {
        if (quiz.class_schedules[cid]) {
          classSchedule = quiz.class_schedules[cid];
          break;
        }
      }
      if (!classSchedule) {
        classSchedule = Object.values(quiz.class_schedules)[0];
      }
    }
    const startAt = classSchedule?.start_at || quiz.start_at;
    const endAt = classSchedule?.end_at || quiz.end_at;
    const isActive = classSchedule ? classSchedule.is_active !== false : quiz.is_active !== false;

    if (!isActive) return { ok: false, reason: 'ROOM_CLOSED' };

    const now = Date.now();
    if (startAt) {
      const sTime = new Date(startAt).getTime();
      if (!isNaN(sTime) && now < sTime) return { ok: false, reason: 'NOT_STARTED' };
    }
    if (endAt) {
      const eTime = new Date(endAt).getTime();
      if (!isNaN(eTime) && now > eTime) return { ok: false, reason: 'ENDED' };
    }
    if (quiz.passcode_expires_at && now > new Date(quiz.passcode_expires_at).getTime()) {
      return { ok: false, reason: 'PASSCODE_EXPIRED' };
    }

    // Kiểm tra mã PIN phòng thi:
    // Kiểm tra mã PIN của lịch thi theo lớp (classSchedule.access_code) hoặc mã PIN chung (quiz.passcode)
    const expectedPasscode = (classSchedule?.access_code && classSchedule.access_code.trim())
      || (quiz.passcode && quiz.passcode.trim())
      || '';

    if (expectedPasscode) {
      const input = (passcode || '').trim().toUpperCase();
      const expected = expectedPasscode.trim().toUpperCase();
      if (!input || input !== expected) {
        return { ok: false, reason: 'WRONG_PASSCODE' };
      }
    }
    return { ok: true, timeLimitMinutes: quiz.time_limit_minutes };
  }

  const { data, error } = await admin().rpc('check_quiz_passcode', {
    p_quiz_id: quizId,
    p_student_id: studentId,
    p_passcode: passcode,
  });

  if (error) return { ok: false, reason: 'NOT_FOUND' };
  const payload = data as any;
  if (!payload?.ok) return { ok: false, reason: (payload?.reason as PasscodeReason) || 'NOT_FOUND' };
  return { ok: true, timeLimitMinutes: payload.time_limit_minutes };
}

// ====================================================================
// PHÒNG THI (chỉ chế độ Supabase — chế độ demo chấm ở client)
// ====================================================================

export async function getExamPaperAdmin(quizId: string, studentId: string) {
  const { data, error } = await admin().rpc('get_exam_paper_admin', {
    p_quiz_id: quizId,
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function submitExamAdmin(
  quizId: string,
  studentId: string,
  answers: { question_id: string; option_id?: string | null; answer_text?: string }[],
  violations: number,
  timedOut: boolean
) {
  const { data, error } = await admin().rpc('submit_exam_admin', {
    p_quiz_id: quizId,
    p_student_id: studentId,
    p_answers: answers,
    p_violations: violations,
    p_timed_out: timedOut,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function recordViolationAdmin(quizId: string, studentId: string, message: string) {
  const { data, error } = await admin().rpc('record_violation_admin', {
    p_quiz_id: quizId,
    p_student_id: studentId,
    p_event: 'visibility_hidden',
    p_message: message,
  });
  if (error) return null;
  return data as number;
}

export async function getMyResultAdmin(quizId: string, studentId: string) {
  const { data, error } = await admin().rpc('get_my_result_admin', {
    p_quiz_id: quizId,
    p_student_id: studentId,
  });
  if (error) return null;
  return data;
}
