import { ClassModule, UserProfile, Quiz, Question, Submission } from '@/types/database';

const STORAGE_KEYS = {
  CLASSES: 'uniquiz_classes',
  STUDENTS_PREFIX: 'uniquiz_students_',
  QUIZZES: 'uniquiz_testbank',
  SUBMISSIONS: 'uniquiz_submissions',
};

// Initial default classes for 2026 - 2027 (empty by default, user-created only)
const DEFAULT_CLASSES: ClassModule[] = [];

const DEFAULT_STUDENTS: Record<string, UserProfile[]> = {};

// Dọn dẹp key cũ và đọc danh sách lớp học phần
export function getStoredClasses(): ClassModule[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEYS.CLASSES);
  let list: ClassModule[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {}
  }

  // Tự động dọn dẹp và chuyển đổi dữ liệu từ phiên bản v1/v2 cũ (nếu có)
  const legacyV2 = localStorage.getItem('uni_quiz_classes_v2');
  const legacyV1 = localStorage.getItem('uni_quiz_classes_v1');
  if (list.length === 0) {
    if (legacyV2) {
      try { list = JSON.parse(legacyV2); } catch {}
    } else if (legacyV1) {
      try { list = JSON.parse(legacyV1); } catch {}
    }
  }

  // Xóa các key thừa cũ
  localStorage.removeItem('uni_quiz_classes_v1');
  localStorage.removeItem('uni_quiz_classes_v2');

  // Loại bỏ các lớp mẫu mock (LOG101 - class-1, class-2) nếu người dùng đã tạo lớp thật (như SCM201 I)
  if (list.some((c) => c.id !== 'class-1' && c.id !== 'class-2')) {
    list = list.filter((c) => c.id !== 'class-1' && c.id !== 'class-2');
  }

  const finalClasses = list.map((c) => ({
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

const DEFAULT_QUIZZES: Quiz[] = [];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.QUIZZES) || localStorage.getItem('uni_quiz_testbank_v1');
  if (!stored) {
    return [];
  }
  try {
    let parsed: Quiz[] = JSON.parse(stored);
    localStorage.removeItem('uni_quiz_testbank_v1');

    // Tự động loại bỏ đề thi mẫu (quiz-logistics-*) nếu người dùng đã tạo đề thật
    if (parsed.some((q) => !q.id.startsWith('quiz-logistics-'))) {
      parsed = parsed.filter((q) => !q.id.startsWith('quiz-logistics-'));
    }

    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    return [];
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

// Xóa 1 đề thi
export function deleteStoredQuiz(quizId: string): Quiz[] {
  const quizzes = getStoredQuizzes();
  const updated = quizzes.filter((q) => q.id !== quizId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
  }
  return updated;
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

// Lấy danh sách ghi danh sinh viên theo từng lớp
export function getAllStoredClassStudents(): Record<string, UserProfile[]> {
  const result: Record<string, UserProfile[]> = {};
  getStoredClasses().forEach((c) => {
    result[c.id] = getStoredStudents(c.id);
  });
  return result;
}

// Lấy toàn bộ ánh xạ ghi danh (student_code <-> class_id)
export function getAllStoredEnrollments(): { class_id: string; student_id: string; student_code: string }[] {
  const list: { class_id: string; student_id: string; student_code: string }[] = [];
  getStoredClasses().forEach((c) => {
    getStoredStudents(c.id).forEach((st) => {
      if (st.student_code) {
        list.push({
          class_id: c.id,
          student_id: st.id,
          student_code: st.student_code.trim().toUpperCase(),
        });
      }
    });
  });
  return list;
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
