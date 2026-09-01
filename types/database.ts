export type UserRole = 'lecturer' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  student_code?: string | null;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface ClassModule {
  id: string;
  code: string;
  name: string;
  semester: string;
  lecturer_id: string;
  created_at: string;
  // Joined fields
  lecturer?: UserProfile;
  students_count?: number;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  // Joined fields
  student?: UserProfile;
  class?: ClassModule;
}

export interface ClassQuizSchedule {
  class_id: string;
  start_at: string; // Khung giờ bắt đầu mở thi cho riêng lớp này
  end_at: string; // Khung giờ kết thúc đóng thi cho riêng lớp này
  access_code?: string | null; // Mã PIN / Mật khẩu vào phòng thi trực tiếp tại lớp
  is_active: boolean; // Công tắc Giảng viên chủ động Bật/Tắt mở phòng thi trực tiếp
}

export interface Quiz {
  id: string;
  class_id?: string; // Optional primary class link
  assigned_class_ids?: string[]; // Array of class IDs assigned to this Quiz
  class_schedules?: Record<string, ClassQuizSchedule>; // Cấu hình khung giờ thi riêng cho từng lớp
  title: string;
  description?: string | null;
  time_limit_minutes: number;
  start_at: string;
  end_at: string;
  is_published: boolean;
  show_results: boolean; // Lecturer toggles if student can view score/answers
  shuffle_questions: boolean; // Trộn thứ tự câu hỏi
  shuffle_options: boolean; // Trộn thứ tự đáp án (A, B, C, D)
  prevent_previous: boolean; // Khóa không cho quay lại câu hỏi trước
  questions_per_student?: number | null; // Số câu hỏi rút ngẫu nhiên cho mỗi sinh viên (VD: 5 câu từ ngân hàng đề)
  created_at: string;
  // Joined fields
  class_name?: string;
  assigned_classes_count?: number;
  questions_count?: number;
}

export type QuestionType = 'multiple_choice' | 'true_false';

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export type SubmissionStatus = 'in_progress' | 'submitted' | 'timed_out';

export interface TabViolationRecord {
  timestamp: string;
  event: 'blur' | 'visibility_hidden';
  message: string;
}

export interface Submission {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string | null;
  total_score?: number | null;
  status: SubmissionStatus;
  tab_violations_count: number;
  warning_history?: TabViolationRecord[];
  // Joined fields
  student?: UserProfile;
  quiz?: Quiz;
  answers?: SubmissionAnswer[];
}

export interface SubmissionAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_id?: string | null;
  answer_text?: string | null;
  is_correct?: boolean | null;
  score_awarded?: number | null;
}
