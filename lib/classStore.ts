const KEY_V1 = 'uni_quiz_classes_v1';
const KEY_V2 = 'uni_quiz_classes_v2';
const STU_KEY_V1 = 'uni_quiz_students_v1';
const STU_KEY_V2 = 'uni_quiz_students_v2';
const QUIZ_KEY_V1 = 'uni_quiz_testbank_v1';

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
    { id: 'st-1', student_code: '20120001', full_name: 'Nguyễn Văn An', email: '20120001@student.university.edu.vn', role: 'student', created_at: new Date().toISOString() },
    { id: 'st-2', student_code: '20120002', full_name: 'Lê Thị Bình', email: '20120002@student.university.edu.vn', role: 'student', created_at: new Date().toISOString() },
    { id: 'st-3', student_code: '20120003', full_name: 'Phạm Hoàng Cường', email: '20120003@student.university.edu.vn', role: 'student', created_at: new Date().toISOString() },
  ],
  'class-2': [
    { id: 'st-4', student_code: '20120004', full_name: 'Trần Thị Dung', email: '20120004@student.university.edu.vn', role: 'student', created_at: new Date().toISOString() },
    { id: 'st-5', student_code: '20120005', full_name: 'Hoàng Văn Em', email: '20120005@student.university.edu.vn', role: 'student', created_at: new Date().toISOString() },
  ],
};

// NON-DESTRUCTIVE: Preserves all user-created classes from v1 and v2
export function getStoredClasses(): ClassModule[] {
  if (typeof window === 'undefined') return DEFAULT_CLASSES;

  const rawV1 = localStorage.getItem(KEY_V1);
  const rawV2 = localStorage.getItem(KEY_V2);

  let mergedList: ClassModule[] = [];

  if (rawV2) {
    try {
      mergedList = JSON.parse(rawV2);
    } catch (e) {}
  }

  // Restore any user-created class from v1 that was not in v2
  if (rawV1) {
    try {
      const v1List: ClassModule[] = JSON.parse(rawV1);
      v1List.forEach((c) => {
        if (!mergedList.some((item) => item.id === c.id)) {
          mergedList.push(c);
        }
      });
    } catch (e) {}
  }

  if (mergedList.length === 0) {
    mergedList = DEFAULT_CLASSES;
  }

  // Update semester labels to 2026 - 2027 WITHOUT removing any class
  const finalClasses = mergedList.map((c) => ({
    ...c,
    semester: !c.semester || c.semester.includes('2025') ? 'HKI (2026 - 2027)' : c.semester,
  }));

  // Sync to both storage keys so no class is ever lost
  localStorage.setItem(KEY_V1, JSON.stringify(finalClasses));
  localStorage.setItem(KEY_V2, JSON.stringify(finalClasses));

  return finalClasses;
}

// Add a new class module and persist across all keys
export function addStoredClass(newClass: ClassModule): ClassModule[] {
  const classes = getStoredClasses();
  const updated = [newClass, ...classes];
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_V1, JSON.stringify(updated));
    localStorage.setItem(KEY_V2, JSON.stringify(updated));
  }
  return updated;
}

// Get single class by ID
export function getStoredClassById(classId: string): ClassModule | undefined {
  const classes = getStoredClasses();
  return classes.find((c) => c.id === classId);
}

// Get students for a specific class ID preserving v1 and v2
export function getStoredStudents(classId: string): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS[classId] || [];

  const rawV1 = localStorage.getItem(`${STU_KEY_V1}_${classId}`);
  const rawV2 = localStorage.getItem(`${STU_KEY_V2}_${classId}`);

  let merged: UserProfile[] = [];
  if (rawV2) {
    try { merged = JSON.parse(rawV2); } catch (e) {}
  }
  if (rawV1) {
    try {
      const v1Sts: UserProfile[] = JSON.parse(rawV1);
      v1Sts.forEach((st) => {
        if (!merged.some((m) => m.student_code === st.student_code)) {
          merged.push(st);
        }
      });
    } catch (e) {}
  }

  if (merged.length === 0) {
    merged = DEFAULT_STUDENTS[classId] || [];
  }

  localStorage.setItem(`${STU_KEY_V1}_${classId}`, JSON.stringify(merged));
  localStorage.setItem(`${STU_KEY_V2}_${classId}`, JSON.stringify(merged));

  return merged;
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
    localStorage.setItem(`${STU_KEY_V1}_${classId}`, JSON.stringify(merged));
    localStorage.setItem(`${STU_KEY_V2}_${classId}`, JSON.stringify(merged));

    const classes = getStoredClasses();
    const updatedClasses = classes.map((c) => (c.id === classId ? { ...c, students_count: merged.length } : c));
    localStorage.setItem(KEY_V1, JSON.stringify(updatedClasses));
    localStorage.setItem(KEY_V2, JSON.stringify(updatedClasses));
  }

  return merged;
}

// Delete student from class
export function deleteStoredStudent(classId: string, studentId: string): UserProfile[] {
  const existing = getStoredStudents(classId);
  const updated = existing.filter((s) => s.id !== studentId);

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STU_KEY_V1}_${classId}`, JSON.stringify(updated));
    localStorage.setItem(`${STU_KEY_V2}_${classId}`, JSON.stringify(updated));

    const classes = getStoredClasses();
    const updatedClasses = classes.map((c) => (c.id === classId ? { ...c, students_count: updated.length } : c));
    localStorage.setItem(KEY_V1, JSON.stringify(updatedClasses));
    localStorage.setItem(KEY_V2, JSON.stringify(updatedClasses));
  }

  return updated;
}

// --------------------------------------------------------------------
// TEST BANK & MULTI-CLASS QUIZ ASSIGNMENT HELPERS
// --------------------------------------------------------------------
import { Quiz } from "@/types/database";

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
    questions_count: 6,
    assigned_classes_count: 2,
  },
];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') return DEFAULT_QUIZZES;
  const stored = localStorage.getItem(QUIZ_KEY_V1);
  if (!stored) {
    localStorage.setItem(QUIZ_KEY_V1, JSON.stringify(DEFAULT_QUIZZES));
    return DEFAULT_QUIZZES;
  }
  try {
    return JSON.parse(stored);
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
    localStorage.setItem(QUIZ_KEY_V1, JSON.stringify(updated));
  }
  return updated;
}
