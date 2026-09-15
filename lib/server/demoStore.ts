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
  deleted_quiz_ids?: string[];
}

const STORE_PATH = path.join(process.env.TEMP_DIR || '/tmp', 'uniquiz_store.json');
const PERSISTENT_STORE_PATH = path.join(process.cwd(), '.uniquiz_store.json');

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

  const defaultClasses = [
    {
      id: 'class-scm201-c',
      code: 'SCM201 C',
      name: 'Quản trị Chuỗi cung ứng - SCM201 C',
      semester: 'HKI (2026 - 2027)',
    },
    {
      id: 'class-scm201-i',
      code: 'SCM201 I',
      name: 'Quản trị Chuỗi cung ứng - SCM201 I',
      semester: 'HKI (2026 - 2027)',
    },
    {
      id: 'class-scm201-e',
      code: 'SCM201 E',
      name: 'Quản trị Chuỗi cung ứng - SCM201 E',
      semester: 'HKI (2026 - 2027)',
    },
  ];

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
    id: 'quiz-05-scm',
    title: 'Quiz 05',
    description: 'Chapter 3: Integrated Operations Planning (p2). Time limit: 5 minutes, 5 randomized questions. No backtracking, immediate 0 score if tab switching is detected.',
    time_limit_minutes: 5,
    is_published: true,
    show_results: false,
    passcode: 'SCM201',
    passcode_expires_at: null,
    class_ids: ['class-scm201-i', 'class-scm201-e'],
    class_schedules: {
      'class-scm201-i': {
        class_id: 'class-scm201-i',
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        access_code: 'SCM201',
        is_active: true,
      },
      'class-scm201-e': {
        class_id: 'class-scm201-e',
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        access_code: 'SCM201',
        is_active: true,
      },
    },
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    is_active: true,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 5,
    questions: chapter3Questions,
  };

  const chapter8Questions: DemoQuestion[] = [
    {
      id: 'c8-q1',
      quiz_id: 'quiz-08-scm',
      question_text: 'Trong quản trị chuỗi cung ứng, mục tiêu chính của việc tối ưu hóa chi phí vận tải và tồn kho là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 0,
      options: [
        { id: 'c8-q1-a', question_id: 'c8-q1', option_text: 'Cân bằng tổng chi phí logistics thấp nhất trong khi vẫn đảm bảo mức độ dịch vụ khách hàng yêu cầu', is_correct: true, order_index: 0 },
        { id: 'c8-q1-b', question_id: 'c8-q1', option_text: 'Chỉ tập trung giảm cước vận chuyển mà không quan tâm đến lượng hàng tồn kho', is_correct: false, order_index: 1 },
        { id: 'c8-q1-c', question_id: 'c8-q1', option_text: 'Tích trữ tối đa lượng hàng tồn kho tại mọi trung tâm phân phối để không bao giờ hết hàng', is_correct: false, order_index: 2 },
        { id: 'c8-q1-d', question_id: 'c8-q1', option_text: 'Loại bỏ hoàn toàn các đối tác 3PL để tự đầu tư phương tiện vận tải', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c8-q2',
      quiz_id: 'quiz-08-scm',
      question_text: 'Chỉ số Fill Rate đo lường điều gì trong quá trình thực hiện đơn hàng?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 1,
      options: [
        { id: 'c8-q2-a', question_id: 'c8-q2', option_text: 'Tỷ lệ phần trăm nhu cầu của khách hàng được đáp ứng ngay lập tức từ lượng hàng sẵn có trong kho', is_correct: true, order_index: 0 },
        { id: 'c8-q2-b', question_id: 'c8-q2', option_text: 'Tỷ lệ hàng hóa bị hư hỏng trong quá trình bốc xếp dỡ hàng', is_correct: false, order_index: 1 },
        { id: 'c8-q2-c', question_id: 'c8-q2', option_text: 'Tốc độ quay vòng của phương tiện vận tải đường dài theo tháng', is_correct: false, order_index: 2 },
        { id: 'c8-q2-d', question_id: 'c8-q2', option_text: 'Số lượng hóa đơn chứng từ hải quan hoàn thành trước hạn', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c8-q3',
      quiz_id: 'quiz-08-scm',
      question_text: 'Phương thức Cross-docking trong quản lý kho bãi mang lại lợi ích nổi bật nào sau đây?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 2,
      options: [
        { id: 'c8-q3-a', question_id: 'c8-q3', option_text: 'Giảm thiểu thời gian và chi phí lưu kho bằng cách chuyển trực tiếp hàng từ xe tải nhập sang xe tải xuất', is_correct: true, order_index: 0 },
        { id: 'c8-q3-b', question_id: 'c8-q3', option_text: 'Tăng diện tích lưu kho dài hạn lên gấp đôi', is_correct: false, order_index: 1 },
        { id: 'c8-q3-c', question_id: 'c8-q3', option_text: 'Kéo dài thời gian kiểm đếm chi tiết tại sàn tiếp nhận', is_correct: false, order_index: 2 },
        { id: 'c8-q3-d', question_id: 'c8-q3', option_text: 'Yêu cầu lưu trữ toàn bộ pallet ít nhất 3 ngày trước khi xuất xưởng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c8-q4',
      quiz_id: 'quiz-08-scm',
      question_text: 'Khái niệm Milk-run trong tuyến đường vận chuyển logistics là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 3,
      options: [
        { id: 'c8-q4-a', question_id: 'c8-q4', option_text: 'Một phương tiện duy nhất thu gom hàng theo lộ trình cố định từ nhiều nhà cung cấp khác nhau', is_correct: true, order_index: 0 },
        { id: 'c8-q4-b', question_id: 'c8-q4', option_text: 'Vận chuyển riêng lẻ từng chuyến trực tiếp cho một nhà cung cấp duy nhất', is_correct: false, order_index: 1 },
        { id: 'c8-q4-c', question_id: 'c8-q4', option_text: 'Tuyến vận tải chỉ chuyên dụng cho các sản phẩm sữa và thực phẩm tươi sống', is_correct: false, order_index: 2 },
        { id: 'c8-q4-d', question_id: 'c8-q4', option_text: 'Phương thức giao hàng chặng cuối dùng xe máy tại khu vực nội đô', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c8-q5',
      quiz_id: 'quiz-08-scm',
      question_text: 'Hệ thống quản lý kho WMS (Warehouse Management System) có chức năng chính là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 4,
      options: [
        { id: 'c8-q5-a', question_id: 'c8-q5', option_text: 'Tự động hóa và tối ưu hóa vị trí lưu trữ, lấy hàng, đóng gói và quản lý luồng hàng trong kho', is_correct: true, order_index: 0 },
        { id: 'c8-q5-b', question_id: 'c8-q5', option_text: 'Chỉ dùng để tính lương cho nhân công bốc vác', is_correct: false, order_index: 1 },
        { id: 'c8-q5-c', question_id: 'c8-q5', option_text: 'Thay thế hoàn toàn hợp đồng ngoại thương quốc tế', is_correct: false, order_index: 2 },
        { id: 'c8-q5-d', question_id: 'c8-q5', option_text: 'Lập trình hệ thống đèn chiếu sáng tự động ngoài cổng kho', is_correct: false, order_index: 3 },
      ],
    },
  ];

  const quiz08: DemoQuiz = {
    id: 'quiz-08-scm',
    title: 'Quiz 08',
    description: 'Kiểm tra trắc nghiệm Quiz 08: Logistics & Quản trị vận tải, kho bãi. Thời gian: 15 phút, 5 câu hỏi ngẫu nhiên.',
    time_limit_minutes: 15,
    is_published: true,
    show_results: false,
    passcode: 'QUIZ08',
    passcode_expires_at: null,
    class_ids: ['class-scm201-i', 'class-scm201-e'],
    class_schedules: {
      'class-scm201-i': {
        class_id: 'class-scm201-i',
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        access_code: 'QUIZ08',
        is_active: true,
      },
      'class-scm201-e': {
        class_id: 'class-scm201-e',
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        access_code: 'QUIZ08',
        is_active: true,
      },
    },
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    is_active: true,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 5,
    questions: chapter8Questions,
  };

  const chapter4Questions: DemoQuestion[] = [
    {
      id: 'c4-q1',
      quiz_id: 'quiz-06-scm',
      question_text: 'Trong hoạt động Mua hàng và Cung ứng (Procurement), khái niệm TCO (Total Cost of Ownership) bao gồm những chi phí nào?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 0,
      options: [
        { id: 'c4-q1-a', question_id: 'c4-q1', option_text: 'Chi phí mua hàng, chi phí vận chuyển, chi phí lưu kho, bảo trì và chi phí thanh lý/thu hồi', is_correct: true, order_index: 0 },
        { id: 'c4-q1-b', question_id: 'c4-q1', option_text: 'Chỉ tính riêng đơn giá ghi trên hóa đơn của nhà cung cấp', is_correct: false, order_index: 1 },
        { id: 'c4-q1-c', question_id: 'c4-q1', option_text: 'Chỉ bao gồm phí thuế nhập khẩu và phí hải quan cảng biển', is_correct: false, order_index: 2 },
        { id: 'c4-q1-d', question_id: 'c4-q1', option_text: 'Chi phí tiếp thị và quảng cáo sản phẩm ra thị trường', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c4-q2',
      quiz_id: 'quiz-06-scm',
      question_text: 'Chiến lược tìm nguồn cung ứng đơn lẻ (Single Sourcing) có ưu điểm lớn nhất là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 1,
      options: [
        { id: 'c4-q2-a', question_id: 'c4-q2', option_text: 'Xây dựng mối quan hệ đối tác chiến lược sâu sắc và đạt được lợi thế kinh tế theo quy mô', is_correct: true, order_index: 0 },
        { id: 'c4-q2-b', question_id: 'c4-q2', option_text: 'Hoàn toàn triệt tiêu rủi ro gián đoạn nguồn cung', is_correct: false, order_index: 1 },
        { id: 'c4-q2-c', question_id: 'c4-q2', option_text: 'Luôn luôn mua được với giá rẻ nhất thị trường vào mọi thời điểm', is_correct: false, order_index: 2 },
        { id: 'c4-q2-d', question_id: 'c4-q2', option_text: 'Không cần ký kết hợp đồng thương mại hay cam kết chất lượng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c4-q3',
      quiz_id: 'quiz-06-scm',
      question_text: 'Trong ma trận Kraljic, các mặt hàng có rủi ro nguồn cung cao và tác động lợi nhuận lớn được xếp vào nhóm nào?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 2,
      options: [
        { id: 'c4-q3-a', question_id: 'c4-q3', option_text: 'Mặt hàng chiến lược (Strategic items)', is_correct: true, order_index: 0 },
        { id: 'c4-q3-b', question_id: 'c4-q3', option_text: 'Mặt hàng đòn bẩy (Leverage items)', is_correct: false, order_index: 1 },
        { id: 'c4-q3-c', question_id: 'c4-q3', option_text: 'Mặt hàng nút cổ chai (Bottleneck items)', is_correct: false, order_index: 2 },
        { id: 'c4-q3-d', question_id: 'c4-q3', option_text: 'Mặt hàng thông thường (Non-critical items)', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c4-q4',
      quiz_id: 'quiz-06-scm',
      question_text: 'Quy trình Mua hàng P2P (Procure-to-Pay) kết thúc bằng bước nào sau đây?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 3,
      options: [
        { id: 'c4-q4-a', question_id: 'c4-q4', option_text: 'Đối soát hóa đơn và thực hiện thanh toán cho nhà cung cấp', is_correct: true, order_index: 0 },
        { id: 'c4-q4-b', question_id: 'c4-q4', option_text: 'Gửi yêu cầu báo giá (RFQ) đến các nhà thầu', is_correct: false, order_index: 1 },
        { id: 'c4-q4-c', question_id: 'c4-q4', option_text: 'Phát hành đơn đặt hàng PO (Purchase Order)', is_correct: false, order_index: 2 },
        { id: 'c4-q4-d', question_id: 'c4-q4', option_text: 'Đánh giá năng lực nhà cung cấp ban đầu', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'c4-q5',
      quiz_id: 'quiz-06-scm',
      question_text: 'Mục đích chính của chứng từ Purchase Order (PO) là gì?',
      question_type: 'multiple_choice',
      points: 2,
      order_index: 4,
      options: [
        { id: 'c4-q5-a', question_id: 'c4-q5', option_text: 'Cam kết pháp lý chính thức từ người mua gửi người bán về chủng loại, số lượng và đơn giá hàng hóa', is_correct: true, order_index: 0 },
        { id: 'c4-q5-b', question_id: 'c4-q5', option_text: 'Xác nhận người mua đã hoàn thành thanh toán tiền hàng', is_correct: false, order_index: 1 },
        { id: 'c4-q5-c', question_id: 'c4-q5', option_text: 'Biên bản bàn giao và kiểm định chất lượng hàng hóa tại kho', is_correct: false, order_index: 2 },
        { id: 'c4-q5-d', question_id: 'c4-q5', option_text: 'Tài liệu hướng dẫn vận hành thiết bị do nhà sản xuất cung cấp', is_correct: false, order_index: 3 },
      ],
    },
  ];

  const quiz06: DemoQuiz = {
    id: 'quiz-06-scm',
    title: 'Quiz 06',
    description: 'Kiểm tra trắc nghiệm Quiz 06: Mua hàng & Quản trị nguồn cung (Procurement & Sourcing). Thời gian: 15 phút, 5 câu hỏi ngẫu nhiên.',
    time_limit_minutes: 15,
    is_published: true,
    show_results: false,
    passcode: 'QUIZ06',
    passcode_expires_at: null,
    class_ids: ['class-scm201-c'],
    class_schedules: {
      'class-scm201-c': {
        class_id: 'class-scm201-c',
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        access_code: 'QUIZ06',
        is_active: true,
      },
    },
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    is_active: true,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 5,
    questions: chapter4Questions,
  };

  const studentC: DemoUser = {
    id: 'st-scm201c-student',
    student_code: '22120777',
    full_name: 'Sinh Viên Lớp SCM201 C',
    email: '22120777@student.university.edu.vn',
    role: 'student',
    date_of_birth: '2004-07-07',
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
    class_ids: ['class-scm201-c', 'class-scm201-i', 'class-scm201-e'],
    class_schedules: {
      'class-scm201-c': {
        class_id: 'class-scm201-c',
        start_at: '2026-09-13T17:59',
        end_at: '2026-09-20T17:59',
        access_code: 'LOG888',
        is_active: true,
      },
      'class-scm201-i': {
        class_id: 'class-scm201-i',
        start_at: '2026-09-13T17:59',
        end_at: '2026-09-20T17:59',
        access_code: 'LOG888',
        is_active: true,
      },
      'class-scm201-e': {
        class_id: 'class-scm201-e',
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
    users: [...lecturers, defaultStudent, studentC],
    classes: defaultClasses,
    enrollments: [
      { class_id: 'class-scm201-c', student_id: 'st-scm201c-student' },
      { class_id: 'class-scm201-i', student_id: 'st-123456789' },
      { class_id: 'class-scm201-e', student_id: 'st-123456789' },
    ],
    quizzes: [defaultQuiz, quiz06, quiz08, midtermQuiz],
    sessions: [],
    scores: [],
    deleted_quiz_ids: [],
  };
}

// Giữ qua các lần hot-reload của Next dev server
const globalStore = globalThis as unknown as { __uniquizDemoDb?: DemoDb };

export function saveDemoDb(): void {
  try {
    if (globalStore.__uniquizDemoDb) {
      const data = JSON.stringify(globalStore.__uniquizDemoDb, null, 2);
      fs.writeFileSync(STORE_PATH, data, 'utf8');
      try {
        fs.writeFileSync(PERSISTENT_STORE_PATH, data, 'utf8');
      } catch {}
    }
  } catch (e) {
    // Bỏ qua lỗi ghi đĩa trong môi trường hạn chế
  }
}

export function loadDemoDb(): DemoDb | null {
  // 1. Thử đọc từ /tmp trước
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.classes)) {
        return parsed;
      }
    }
  } catch (e) {}

  // 2. Dự phòng đọc từ file lưu trữ bền vững tại thư mục dự án
  try {
    if (fs.existsSync(PERSISTENT_STORE_PATH)) {
      const raw = fs.readFileSync(PERSISTENT_STORE_PATH, 'utf8');
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
    // Luôn đồng bộ danh sách đề thi, người dùng, lớp, ghi danh và ĐIỂM SỐ theo đúng file lưu trữ trên đĩa
    globalStore.__uniquizDemoDb.quizzes = fromDisk.quizzes;
    if (Array.isArray(fromDisk.users)) {
      globalStore.__uniquizDemoDb.users = fromDisk.users;
    }
    if (Array.isArray(fromDisk.classes)) {
      globalStore.__uniquizDemoDb.classes = fromDisk.classes;
    }
    if (Array.isArray(fromDisk.enrollments)) {
      globalStore.__uniquizDemoDb.enrollments = fromDisk.enrollments;
    }
    if (Array.isArray(fromDisk.scores)) {
      // Hợp nhất điểm số trên đĩa với điểm số trong bộ nhớ (không làm mất điểm số vừa nộp)
      const existingScores = globalStore.__uniquizDemoDb.scores || [];
      const scoreMap = new Map<string, DemoScore>();
      for (const s of fromDisk.scores) {
        scoreMap.set(`${s.quiz_id}_${s.student_id}`, s);
      }
      for (const s of existingScores) {
        scoreMap.set(`${s.quiz_id}_${s.student_id}`, s);
      }
      globalStore.__uniquizDemoDb.scores = Array.from(scoreMap.values());
    }
    if (Array.isArray(fromDisk.deleted_quiz_ids)) {
      globalStore.__uniquizDemoDb.deleted_quiz_ids = Array.from(
        new Set([...(globalStore.__uniquizDemoDb.deleted_quiz_ids || []), ...fromDisk.deleted_quiz_ids])
      );
    }
  }

  // Tự động nâng cấp / đồng bộ cấu hình nếu các đề thi thiếu section_sampling hoặc passcode
  const db = globalStore.__uniquizDemoDb!;
  let modified = false;

  if (!Array.isArray(db.deleted_quiz_ids)) {
    db.deleted_quiz_ids = [];
  }

  // 1. Luôn loại bỏ vĩnh viễn đề thi cũ đã bị xoá: 'quiz-midterm-logistics' / 'Đề Thi Giữa Kỳ (Midterm Exam)' hoặc trong danh sách deleted_quiz_ids
  const beforeLen = db.quizzes.length;
  db.quizzes = db.quizzes.filter(
    (q) => q.id !== 'quiz-midterm-logistics' && 
           !q.title.includes('Đề Thi Giữa Kỳ (Midterm Exam)') &&
           !db.deleted_quiz_ids!.includes(q.id)
  );
  if (db.quizzes.length !== beforeLen) {
    modified = true;
  }

  // 2. Bảo đảm đề thi 'Midterm' mà Giảng viên giữ luôn luôn có mặt và đầy đủ câu hỏi (nếu giảng viên chưa xoá)
  const isMidtermDeleted = db.deleted_quiz_ids.includes('midterm-scm-2026');
  if (!isMidtermDeleted) {
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

  // 3. Đảm bảo cả ba lớp SCM201 C, SCM201 I và SCM201 E đều luôn có mặt
  const hasClassC = db.classes.some((c) => c.id === 'class-scm201-c' || (c.code || '').trim().toUpperCase() === 'SCM201 C');
  if (!hasClassC) {
    db.classes.unshift({
      id: 'class-scm201-c',
      code: 'SCM201 C',
      name: 'Quản trị Chuỗi cung ứng - SCM201 C',
      semester: 'HKI (2026 - 2027)',
    });
    modified = true;
  }

  const hasClassI = db.classes.some((c) => c.id === 'class-scm201-i' || (c.code || '').trim().toUpperCase() === 'SCM201 I');
  if (!hasClassI) {
    db.classes.push({
      id: 'class-scm201-i',
      code: 'SCM201 I',
      name: 'Quản trị Chuỗi cung ứng - SCM201 I',
      semester: 'HKI (2026 - 2027)',
    });
    modified = true;
  }

  const hasClassE = db.classes.some((c) => c.id === 'class-scm201-e' || (c.code || '').trim().toUpperCase() === 'SCM201 E');
  if (!hasClassE) {
    db.classes.push({
      id: 'class-scm201-e',
      code: 'SCM201 E',
      name: 'Quản trị Chuỗi cung ứng - SCM201 E',
      semester: 'HKI (2026 - 2027)',
    });
    modified = true;
  }

  // Đảm bảo có sinh viên mẫu đại diện cho lớp SCM201 C
  const hasStudentC = db.users.some((u) => u.id === 'st-scm201c-student' || (u.student_code || '').trim().toUpperCase() === '22120777');
  if (!hasStudentC) {
    db.users.push({
      id: 'st-scm201c-student',
      student_code: '22120777',
      full_name: 'Sinh Viên Lớp SCM201 C',
      email: '22120777@student.university.edu.vn',
      role: 'student',
      date_of_birth: '2004-07-07',
    });
    modified = true;
  }
  const stCUser = db.users.find((u) => u.id === 'st-scm201c-student' || (u.student_code || '').trim().toUpperCase() === '22120777');
  if (stCUser && !db.enrollments.some((e) => e.class_id === 'class-scm201-c' && e.student_id === stCUser.id)) {
    db.enrollments.push({ class_id: 'class-scm201-c', student_id: stCUser.id });
    modified = true;
  }

  // Đảm bảo có đề thi Quiz 06 gán riêng cho lớp SCM201 C (chỉ khởi tạo nếu giảng viên chưa từng xóa)
  const isQuiz06Deleted = db.deleted_quiz_ids.includes('quiz-06-scm');
  if (!isQuiz06Deleted) {
    const hasQuiz06 = db.quizzes.some((q) => q.id === 'quiz-06-scm' || (q.title || '').toLowerCase().includes('quiz 06'));
    if (!hasQuiz06) {
      db.quizzes.push({
        id: 'quiz-06-scm',
        title: 'Quiz 06',
        description: 'Kiểm tra trắc nghiệm Quiz 06: Mua hàng & Quản trị nguồn cung (Procurement & Sourcing). Thời gian: 15 phút, 5 câu hỏi ngẫu nhiên.',
        time_limit_minutes: 15,
        is_published: true,
        show_results: false,
        passcode: 'QUIZ06',
        passcode_expires_at: null,
        class_ids: ['class-scm201-c'],
        class_schedules: {
          'class-scm201-c': {
            class_id: 'class-scm201-c',
            start_at: new Date(Date.now() - 3600000).toISOString(),
            end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
            access_code: 'QUIZ06',
            is_active: true,
          },
        },
        start_at: new Date(Date.now() - 3600000).toISOString(),
        end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        is_active: true,
        shuffle_questions: true,
        shuffle_options: true,
        prevent_previous: true,
        questions_per_student: 5,
        questions: [
          {
            id: 'c4-q1',
            quiz_id: 'quiz-06-scm',
            question_text: 'Trong hoạt động Mua hàng và Cung ứng (Procurement), khái niệm TCO (Total Cost of Ownership) bao gồm những chi phí nào?',
            question_type: 'multiple_choice',
            points: 2,
            order_index: 0,
            options: [
              { id: 'c4-q1-a', question_id: 'c4-q1', option_text: 'Chi phí mua hàng, chi phí vận chuyển, chi phí lưu kho, bảo trì và chi phí thanh lý/thu hồi', is_correct: true, order_index: 0 },
              { id: 'c4-q1-b', question_id: 'c4-q1', option_text: 'Chỉ tính riêng đơn giá ghi trên hóa đơn của nhà cung cấp', is_correct: false, order_index: 1 },
              { id: 'c4-q1-c', question_id: 'c4-q1', option_text: 'Chỉ bao gồm phí thuế nhập khẩu và phí hải quan cảng biển', is_correct: false, order_index: 2 },
              { id: 'c4-q1-d', question_id: 'c4-q1', option_text: 'Chi phí tiếp thị và quảng cáo sản phẩm ra thị trường', is_correct: false, order_index: 3 },
            ],
          },
          {
            id: 'c4-q2',
            quiz_id: 'quiz-06-scm',
            question_text: 'Chiến lược tìm nguồn cung ứng đơn lẻ (Single Sourcing) có ưu điểm lớn nhất là gì?',
            question_type: 'multiple_choice',
            points: 2,
            order_index: 1,
            options: [
              { id: 'c4-q2-a', question_id: 'c4-q2', option_text: 'Xây dựng mối quan hệ đối tác chiến lược sâu sắc và đạt được lợi thế kinh tế theo quy mô', is_correct: true, order_index: 0 },
              { id: 'c4-q2-b', question_id: 'c4-q2', option_text: 'Hoàn toàn triệt tiêu rủi ro gián đoạn nguồn cung', is_correct: false, order_index: 1 },
              { id: 'c4-q2-c', question_id: 'c4-q2', option_text: 'Luôn luôn mua được với giá rẻ nhất thị trường vào mọi thời điểm', is_correct: false, order_index: 2 },
              { id: 'c4-q2-d', question_id: 'c4-q2', option_text: 'Không cần ký kết hợp đồng thương mại hay cam kết chất lượng', is_correct: false, order_index: 3 },
            ],
          },
          {
            id: 'c4-q3',
            quiz_id: 'quiz-06-scm',
            question_text: 'Trong ma trận Kraljic, các mặt hàng có rủi ro nguồn cung cao và tác động lợi nhuận lớn được xếp vào nhóm nào?',
            question_type: 'multiple_choice',
            points: 2,
            order_index: 2,
            options: [
              { id: 'c4-q3-a', question_id: 'c4-q3', option_text: 'Mặt hàng chiến lược (Strategic items)', is_correct: true, order_index: 0 },
              { id: 'c4-q3-b', question_id: 'c4-q3', option_text: 'Mặt hàng đòn bẩy (Leverage items)', is_correct: false, order_index: 1 },
              { id: 'c4-q3-c', question_id: 'c4-q3', option_text: 'Mặt hàng nút cổ chai (Bottleneck items)', is_correct: false, order_index: 2 },
              { id: 'c4-q3-d', question_id: 'c4-q3', option_text: 'Mặt hàng thông thường (Non-critical items)', is_correct: false, order_index: 3 },
            ],
          },
          {
            id: 'c4-q4',
            quiz_id: 'quiz-06-scm',
            question_text: 'Quy trình Mua hàng P2P (Procure-to-Pay) kết thúc bằng bước nào sau đây?',
            question_type: 'multiple_choice',
            points: 2,
            order_index: 3,
            options: [
              { id: 'c4-q4-a', question_id: 'c4-q4', option_text: 'Đối soát hóa đơn và thực hiện thanh toán cho nhà cung cấp', is_correct: true, order_index: 0 },
              { id: 'c4-q4-b', question_id: 'c4-q4', option_text: 'Gửi yêu cầu báo giá (RFQ) đến các nhà thầu', is_correct: false, order_index: 1 },
              { id: 'c4-q4-c', question_id: 'c4-q4', option_text: 'Phát hành đơn đặt hàng PO (Purchase Order)', is_correct: false, order_index: 2 },
              { id: 'c4-q4-d', question_id: 'c4-q4', option_text: 'Đánh giá năng lực nhà cung cấp ban đầu', is_correct: false, order_index: 3 },
            ],
          },
          {
            id: 'c4-q5',
            quiz_id: 'quiz-06-scm',
            question_text: 'Mục đích chính của chứng từ Purchase Order (PO) là gì?',
            question_type: 'multiple_choice',
            points: 2,
            order_index: 4,
            options: [
              { id: 'c4-q5-a', question_id: 'c4-q5', option_text: 'Cam kết pháp lý chính thức từ người mua gửi người bán về chủng loại, số lượng và đơn giá hàng hóa', is_correct: true, order_index: 0 },
              { id: 'c4-q5-b', question_id: 'c4-q5', option_text: 'Xác nhận người mua đã hoàn thành thanh toán tiền hàng', is_correct: false, order_index: 1 },
              { id: 'c4-q5-c', question_id: 'c4-q5', option_text: 'Biên bản bàn giao và kiểm định chất lượng hàng hóa tại kho', is_correct: false, order_index: 2 },
              { id: 'c4-q5-d', question_id: 'c4-q5', option_text: 'Tài liệu hướng dẫn vận hành thiết bị do nhà sản xuất cung cấp', is_correct: false, order_index: 3 },
            ],
          },
        ],
      });
      modified = true;
    }
  }

  // 4. Đảm bảo lịch thi (class_schedules) và mã phòng thi hợp lệ cho các lớp được phân công
  for (const q of db.quizzes) {
    if (!q.class_ids) q.class_ids = [];
    let changedQuiz = false;

    // Nếu đề thi chưa được gán lớp nào, gán lớp mặc định
    if (q.class_ids.length === 0) {
      const titleLower = (q.title || '').toLowerCase();
      if (q.id === 'midterm-scm-2026' || titleLower.includes('midterm')) {
        q.class_ids = ['class-scm201-c', 'class-scm201-i', 'class-scm201-e'];
      } else if (q.id.includes('quiz-08') || titleLower.includes('quiz 08') || titleLower.includes('quiz - 08')) {
        q.class_ids = ['class-scm201-e'];
      } else if (q.id.includes('quiz-06') || titleLower.includes('quiz 06') || titleLower.includes('quiz - 06')) {
        q.class_ids = ['class-scm201-c'];
      } else {
        q.class_ids = ['class-scm201-i'];
      }
      changedQuiz = true;
    }

    if (!q.class_schedules) q.class_schedules = {};

    let refSchedule: any = Object.values(q.class_schedules)[0] || null;
    let expectedCode = (q.passcode && q.passcode.trim()) || refSchedule?.access_code || '';
    const titleLower = (q.title || '').toLowerCase();
    if (!expectedCode) {
      if (q.id === 'midterm-scm-2026' || titleLower.includes('midterm')) expectedCode = 'LOG888';
      else if (q.id.includes('quiz-05') || titleLower.includes('quiz 05') || titleLower.includes('quiz - 05')) expectedCode = 'SCM201';
      else if (q.id.includes('quiz-06') || titleLower.includes('quiz 06') || titleLower.includes('quiz - 06')) expectedCode = 'QUIZ06';
      else if (q.id.includes('quiz-08') || titleLower.includes('quiz 08') || titleLower.includes('quiz - 08')) expectedCode = 'QUIZ08';
    }

    for (const cid of q.class_ids) {
      if (!q.class_schedules[cid]) {
        q.class_schedules[cid] = {
          class_id: cid,
          start_at: refSchedule?.start_at || q.start_at || new Date(Date.now() - 3600000).toISOString(),
          end_at: refSchedule?.end_at || q.end_at || new Date(Date.now() + 86400000 * 30).toISOString(),
          access_code: expectedCode || 'QUIZ08',
          is_active: true,
        };
        changedQuiz = true;
      } else {
        if (!q.class_schedules[cid].access_code && expectedCode) {
          q.class_schedules[cid].access_code = expectedCode;
          changedQuiz = true;
        }
      }
    }

    if (!q.passcode && expectedCode) {
      q.passcode = expectedCode;
      changedQuiz = true;
    }

    if (changedQuiz) {
      modified = true;
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
