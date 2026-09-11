import { ClassModule, UserProfile, Quiz, Question, Submission } from '@/types/database';

const STORAGE_KEYS = {
  CLASSES: 'uniquiz_classes',
  STUDENTS_PREFIX: 'uniquiz_students_',
  QUIZZES: 'uniquiz_testbank',
  SUBMISSIONS: 'uniquiz_submissions',
};

// Initial default classes for 2026 - 2027
const DEFAULT_CLASSES: ClassModule[] = [
  {
    id: 'class-1',
    code: 'LOG101',
    name: 'Introduction to Logistics & SCM - Nhóm 01',
    semester: 'HKI (2026 - 2027)',
    lecturer_id: 'lecturer-uuid-1',
    created_at: new Date().toISOString(),
    students_count: 3,
  },
  {
    id: 'class-2',
    code: 'LOG101',
    name: 'Introduction to Logistics & SCM - Nhóm 02',
    semester: 'HKI (2026 - 2027)',
    lecturer_id: 'lecturer-uuid-1',
    created_at: new Date().toISOString(),
    students_count: 2,
  },
];

const DEFAULT_STUDENTS: Record<string, UserProfile[]> = {
  'class-1': [
    { id: 'st-1', student_code: '20120001', full_name: 'Nguyễn Văn An', email: '20120001@student.university.edu.vn', role: 'student', date_of_birth: '2004-01-15', created_at: new Date().toISOString() },
    { id: 'st-2', student_code: '20120002', full_name: 'Lê Thị Bình', email: '20120002@student.university.edu.vn', role: 'student', date_of_birth: '2004-03-22', created_at: new Date().toISOString() },
    { id: 'st-3', student_code: '20120003', full_name: 'Phạm Hoàng Cường', email: '20120003@student.university.edu.vn', role: 'student', date_of_birth: '2003-11-05', created_at: new Date().toISOString() },
  ],
  'class-2': [
    { id: 'st-4', student_code: '20120004', full_name: 'Trần Thị Dung', email: '20120004@student.university.edu.vn', role: 'student', date_of_birth: '2004-07-30', created_at: new Date().toISOString() },
    { id: 'st-5', student_code: '20120005', full_name: 'Hoàng Văn Em', email: '20120005@student.university.edu.vn', role: 'student', date_of_birth: '2003-09-12', created_at: new Date().toISOString() },
  ],
};

// Dọn dẹp key cũ và đọc danh sách lớp học phần
export function getStoredClasses(): ClassModule[] {
  if (typeof window === 'undefined') return DEFAULT_CLASSES;

  const raw = localStorage.getItem(STORAGE_KEYS.CLASSES);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }

  // Tự động dọn dẹp và chuyển đổi dữ liệu từ phiên bản v1/v2 cũ (nếu có)
  const legacyV2 = localStorage.getItem('uni_quiz_classes_v2');
  const legacyV1 = localStorage.getItem('uni_quiz_classes_v1');
  let list: ClassModule[] = [];
  if (legacyV2) {
    try { list = JSON.parse(legacyV2); } catch {}
  } else if (legacyV1) {
    try { list = JSON.parse(legacyV1); } catch {}
  }

  // Xóa các key thừa cũ
  localStorage.removeItem('uni_quiz_classes_v1');
  localStorage.removeItem('uni_quiz_classes_v2');

  const finalClasses = (list.length > 0 ? list : DEFAULT_CLASSES).map((c) => ({
    ...c,
    semester: !c.semester || c.semester.includes('2025') ? 'HKI (2026 - 2027)' : c.semester,
  }));

  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(finalClasses));
  return finalClasses;
}

// Add a new class module
export function addStoredClass(newClass: ClassModule): ClassModule[] {
  const classes = getStoredClasses();
  const updated = [newClass, ...classes];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
  }
  return updated;
}

// Update a class module
export function updateStoredClass(id: string, updates: Partial<ClassModule>): ClassModule[] {
  const classes = getStoredClasses();
  const updated = classes.map(c => c.id === id ? { ...c, ...updates } : c);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
  }
  return updated;
}

// Delete a class module
export function deleteStoredClass(id: string): ClassModule[] {
  const classes = getStoredClasses();
  const updated = classes.filter(c => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updated));
    localStorage.removeItem(`${STORAGE_KEYS.STUDENTS_PREFIX}${id}`); // clean up students
  }
  return updated;
}

// Get single class by ID
export function getStoredClassById(classId: string): ClassModule | undefined {
  const classes = getStoredClasses();
  return classes.find((c) => c.id === classId);
}

// Get students for a specific class ID
export function getStoredStudents(classId: string): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS[classId] || [];

  const key = `${STORAGE_KEYS.STUDENTS_PREFIX}${classId}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }

  // Dọn dẹp key cũ (nếu có)
  const legacy = localStorage.getItem(`uni_quiz_students_v2_${classId}`) || localStorage.getItem(`uni_quiz_students_v1_${classId}`);
  let list: UserProfile[] = [];
  if (legacy) {
    try { list = JSON.parse(legacy); } catch {}
  }
  localStorage.removeItem(`uni_quiz_students_v1_${classId}`);
  localStorage.removeItem(`uni_quiz_students_v2_${classId}`);

  if (list.length === 0) {
    list = DEFAULT_STUDENTS[classId] || [];
  }

  // Bù ngày sinh cho sinh viên mẫu nếu thiếu
  const defaults = DEFAULT_STUDENTS[classId] || [];
  list = list.map((st) => {
    if (st.date_of_birth) return st;
    const fallback = defaults.find((d) => d.student_code === st.student_code);
    return fallback?.date_of_birth ? { ...st, date_of_birth: fallback.date_of_birth } : st;
  });

  localStorage.setItem(key, JSON.stringify(list));
  return list;
}

// Save/Merge imported Excel students into a specific class ID
export function saveStoredStudents(classId: string, newStudents: UserProfile[]): UserProfile[] {
  const existing = getStoredStudents(classId);

  const merged = [...existing];
  newStudents.forEach((st) => {
    if (!merged.some((m) => m.student_code === st.student_code)) {
      merged.push(st);
    }
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEYS.STUDENTS_PREFIX}${classId}`, JSON.stringify(merged));

    const classes = getStoredClasses();
    const updatedClasses = classes.map((c) => (c.id === classId ? { ...c, students_count: merged.length } : c));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updatedClasses));
  }

  return merged;
}

// Delete student from class
export function deleteStoredStudent(classId: string, studentId: string): UserProfile[] {
  const existing = getStoredStudents(classId);
  const updated = existing.filter((s) => s.id !== studentId);

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEYS.STUDENTS_PREFIX}${classId}`, JSON.stringify(updated));

    const classes = getStoredClasses();
    const updatedClasses = classes.map((c) => (c.id === classId ? { ...c, students_count: updated.length } : c));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(updatedClasses));
  }

  return updated;
}

// --------------------------------------------------------------------
// TEST BANK & MULTI-CLASS QUIZ ASSIGNMENT HELPERS
// --------------------------------------------------------------------


// Ngân hàng câu hỏi mặc định cho đề Logistics (đúng chủ đề của đề thi mẫu)
const DEFAULT_QUESTION_BANK: Question[] = [
  {
    id: 'lq-1', quiz_id: 'quiz-logistics-1', question_type: 'multiple_choice', points: 1, order_index: 0,
    question_text: 'Yếu tố nào sau đây là mục tiêu 7Rs cốt lõi trong hoạt động Logistics?',
    options: [
      { id: 'lq-1-a', question_id: 'lq-1', option_text: 'Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, Right Price', is_correct: true, order_index: 0 },
      { id: 'lq-1-b', question_id: 'lq-1', option_text: 'Right Route, Right Risk, Right Revenue, Right Requirement, Right Resource, Right Return, Right Rate', is_correct: false, order_index: 1 },
      { id: 'lq-1-c', question_id: 'lq-1', option_text: 'Right Storage, Right Safety, Right Speed, Right System, Right Scale, Right Strategy, Right Scope', is_correct: false, order_index: 2 },
    ],
  },
  {
    id: 'lq-2', quiz_id: 'quiz-logistics-1', question_type: 'true_false', points: 1, order_index: 1,
    question_text: 'Bullwhip Effect mô tả hiện tượng biến động nhu cầu gia tăng khi đi ngược lên phía trên Chuỗi cung ứng.',
    options: [
      { id: 'lq-2-a', question_id: 'lq-2', option_text: 'Đúng', is_correct: true, order_index: 0 },
      { id: 'lq-2-b', question_id: 'lq-2', option_text: 'Sai', is_correct: false, order_index: 1 },
    ],
  },
  {
    id: 'lq-3', quiz_id: 'quiz-logistics-1', question_type: 'multiple_choice', points: 1, order_index: 2,
    question_text: 'Khái niệm 3PL (Third-Party Logistics) dùng để chỉ đối tượng nào?',
    options: [
      { id: 'lq-3-a', question_id: 'lq-3', option_text: 'Công ty dịch vụ logistics bên thứ ba đảm nhận vận tải & kho bãi', is_correct: true, order_index: 0 },
      { id: 'lq-3-b', question_id: 'lq-3', option_text: 'Nhà sản xuất trực tiếp tự vận hành kho', is_correct: false, order_index: 1 },
      { id: 'lq-3-c', question_id: 'lq-3', option_text: 'Khách hàng tiêu dùng cuối cùng', is_correct: false, order_index: 2 },
      { id: 'lq-3-d', question_id: 'lq-3', option_text: 'Cơ quan hải quan nhà nước', is_correct: false, order_index: 3 },
    ],
  },
  {
    id: 'lq-4', quiz_id: 'quiz-logistics-1', question_type: 'multiple_choice', points: 1, order_index: 3,
    question_text: 'Phương thức vận tải nào có chi phí đơn vị thấp nhất cho hàng siêu trường siêu trọng trên cự ly dài?',
    options: [
      { id: 'lq-4-a', question_id: 'lq-4', option_text: 'Vận tải đường hàng không (Air Freight)', is_correct: false, order_index: 0 },
      { id: 'lq-4-b', question_id: 'lq-4', option_text: 'Vận tải đường biển (Sea Freight)', is_correct: true, order_index: 1 },
      { id: 'lq-4-c', question_id: 'lq-4', option_text: 'Vận tải đường bộ bằng xe tải', is_correct: false, order_index: 2 },
      { id: 'lq-4-d', question_id: 'lq-4', option_text: 'Vận tải bằng đường bưu điện express', is_correct: false, order_index: 3 },
    ],
  },
  {
    id: 'lq-5', quiz_id: 'quiz-logistics-1', question_type: 'true_false', points: 1, order_index: 4,
    question_text: 'Chỉ số KPI On-Time In-Full (OTIF) đo lường hiệu quả giao hàng đúng giờ và đủ số lượng.',
    options: [
      { id: 'lq-5-a', question_id: 'lq-5', option_text: 'Đúng', is_correct: true, order_index: 0 },
      { id: 'lq-5-b', question_id: 'lq-5', option_text: 'Sai', is_correct: false, order_index: 1 },
    ],
  },
  {
    id: 'lq-6', quiz_id: 'quiz-logistics-1', question_type: 'multiple_choice', points: 1, order_index: 5,
    question_text: 'Mô hình EOQ (Economic Order Quantity) dùng để xác định điều gì?',
    options: [
      { id: 'lq-6-a', question_id: 'lq-6', option_text: 'Sản lượng đặt hàng tối ưu cân bằng chi phí đặt hàng và chi phí lưu kho', is_correct: true, order_index: 0 },
      { id: 'lq-6-b', question_id: 'lq-6', option_text: 'Số lượng nhà cung cấp tối thiểu cần có', is_correct: false, order_index: 1 },
      { id: 'lq-6-c', question_id: 'lq-6', option_text: 'Tốc độ luân chuyển hàng tồn kho theo quý', is_correct: false, order_index: 2 },
      { id: 'lq-6-d', question_id: 'lq-6', option_text: 'Thời gian giao hàng trung bình của nhà vận tải', is_correct: false, order_index: 3 },
    ],
  },
];

const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'quiz-logistics-1',
    assigned_class_ids: ['class-1', 'class-2'],
    title: 'Bài Kiểm Tra Giữa Kỳ - Introduction to Logistics & SCM',
    description: 'Đề thi trắc nghiệm rút ngẫu nhiên 5 câu từ Ngân hàng đề thi chung.',
    time_limit_minutes: 45,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_published: true,
    show_results: false,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 5,
    created_at: new Date().toISOString(),
    questions: DEFAULT_QUESTION_BANK,
    questions_count: DEFAULT_QUESTION_BANK.length,
    assigned_classes_count: 2,
  },
];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') return DEFAULT_QUIZZES;
  const stored = localStorage.getItem(STORAGE_KEYS.QUIZZES) || localStorage.getItem('uni_quiz_testbank_v1');
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(DEFAULT_QUIZZES));
    return DEFAULT_QUIZZES;
  }
  try {
    const parsed: Quiz[] = JSON.parse(stored);
    // Migration: đề mẫu được lưu từ phiên bản cũ chưa có ngân hàng câu hỏi
    const migrated = parsed.map((q) =>
      !q.questions || q.questions.length === 0
        ? { ...q, questions: DEFAULT_QUESTION_BANK, questions_count: DEFAULT_QUESTION_BANK.length }
        : q
    );
    localStorage.removeItem('uni_quiz_testbank_v1');
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(migrated));
    return migrated;
  } catch (e) {
    return DEFAULT_QUIZZES;
  }
}

export function saveStoredQuiz(newQuiz: Quiz): Quiz[] {
  const quizzes = getStoredQuizzes();
  const index = quizzes.findIndex((q) => q.id === newQuiz.id);
  let updated: Quiz[] = [];

  if (index >= 0) {
    updated = [...quizzes];
    updated[index] = newQuiz;
  } else {
    updated = [newQuiz, ...quizzes];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
  }
  return updated;
}

// Lấy 1 đề thi theo ID
export function getStoredQuizById(quizId: string): Quiz | undefined {
  return getStoredQuizzes().find((q) => q.id === quizId);
}

// Toàn bộ sinh viên của mọi lớp (dùng để đối chiếu bài nộp)
export function getAllStoredStudents(): UserProfile[] {
  const all: UserProfile[] = [];
  getStoredClasses().forEach((c) => {
    getStoredStudents(c.id).forEach((st) => {
      if (!all.some((s) => s.student_code === st.student_code)) all.push(st);
    });
  });
  return all;
}

// --------------------------------------------------------------------
// SUBMISSION STORE (bài làm & điểm số của sinh viên)
// --------------------------------------------------------------------
export function getStoredSubmissions(): Submission[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || localStorage.getItem('uni_quiz_submissions_v1');
  if (!raw) return [];
  try {
    localStorage.removeItem('uni_quiz_submissions_v1');
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, raw);
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function getSubmissionsByQuiz(quizId: string): Submission[] {
  return getStoredSubmissions().filter((s) => s.quiz_id === quizId);
}

export function getSubmission(quizId: string, studentId: string): Submission | undefined {
  return getStoredSubmissions().find((s) => s.quiz_id === quizId && s.student_id === studentId);
}

// Ghi đè bài nộp cũ của cùng (quiz, sinh viên) để tránh trùng lặp
export function saveStoredSubmission(submission: Submission): Submission[] {
  const all = getStoredSubmissions();
  const idx = all.findIndex((s) => s.quiz_id === submission.quiz_id && s.student_id === submission.student_id);
  const updated = [...all];
  if (idx >= 0) updated[idx] = submission;
  else updated.unshift(submission);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(updated));
  }
  return updated;
}
