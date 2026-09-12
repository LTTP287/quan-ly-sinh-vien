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


// Ngân hàng câu hỏi mặc định cho đề Logistics & SCM
export const DEFAULT_QUESTION_BANK: Question[] = [
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

export function createDefaultMidtermQuiz(): Quiz {
  const quizId = 'quiz-midterm-logistics';
  const now = new Date();
  const end = new Date(Date.now() + 86400000 * 30);

  const mcQuestions: Question[] = [
    {
      id: 'midterm-mc-1', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 0,
      question_text: 'Yếu tố nào sau đây là mục tiêu 7Rs cốt lõi trong hoạt động Logistics?',
      options: [
        { id: 'opt-1-a', question_id: 'midterm-mc-1', option_text: 'Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, Right Price', is_correct: true, order_index: 0 },
        { id: 'opt-1-b', question_id: 'midterm-mc-1', option_text: 'Right Route, Right Risk, Right Revenue, Right Requirement, Right Resource, Right Return, Right Rate', is_correct: false, order_index: 1 },
        { id: 'opt-1-c', question_id: 'midterm-mc-1', option_text: 'Right Storage, Right Safety, Right Speed, Right System, Right Scale, Right Strategy, Right Scope', is_correct: false, order_index: 2 },
        { id: 'opt-1-d', question_id: 'midterm-mc-1', option_text: 'Right Port, Right Plane, Right Partner, Right Package, Right Process, Right Profit, Right Purpose', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-2', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 1,
      question_text: 'Mô hình Bullwhip Effect mô tả hiện tượng nào sau đây?',
      options: [
        { id: 'opt-2-a', question_id: 'midterm-mc-2', option_text: 'Biến động nhu cầu gia tăng khi đi ngược lên phía trên Chuỗi cung ứng từ bán lẻ đến nhà sản xuất', is_correct: true, order_index: 0 },
        { id: 'opt-2-b', question_id: 'midterm-mc-2', option_text: 'Sự suy giảm liên tục của lượng tồn kho an toàn tại các nhà phân phối cấp 1', is_correct: false, order_index: 1 },
        { id: 'opt-2-c', question_id: 'midterm-mc-2', option_text: 'Chi phí vận chuyển đường bộ tăng đều đặn theo khoảng cách địa lý', is_correct: false, order_index: 2 },
        { id: 'opt-2-d', question_id: 'midterm-mc-2', option_text: 'Tốc độ quay vòng vốn lưu động của toàn bộ các tác nhân trong mạng lưới', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-3', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 2,
      question_text: 'Thuật ngữ 3PL (Third-Party Logistics) để chỉ đối tượng nào?',
      options: [
        { id: 'opt-3-a', question_id: 'midterm-mc-3', option_text: 'Công ty dịch vụ logistics bên thứ ba cung cấp vận tải, kho bãi và thủ tục hải quan', is_correct: true, order_index: 0 },
        { id: 'opt-3-b', question_id: 'midterm-mc-3', option_text: 'Doanh nghiệp sản xuất tự vận hành đội xe và hệ thống kho hàng nội bộ', is_correct: false, order_index: 1 },
        { id: 'opt-3-c', question_id: 'midterm-mc-3', option_text: 'Người tiêu dùng cuối cùng nhận hàng tại điểm nhận bưu phẩm', is_correct: false, order_index: 2 },
        { id: 'opt-3-d', question_id: 'midterm-mc-3', option_text: 'Cơ quan kiểm định chất lượng hàng hóa nhập khẩu của nhà nước', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-4', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 3,
      question_text: 'Phương thức vận tải nào có chi phí đơn vị thấp nhất cho hàng rời khối lượng lớn trên cự ly dài?',
      options: [
        { id: 'opt-4-a', question_id: 'midterm-mc-4', option_text: 'Vận tải đường biển (Sea Freight)', is_correct: true, order_index: 0 },
        { id: 'opt-4-b', question_id: 'midterm-mc-4', option_text: 'Vận tải đường hàng không (Air Freight)', is_correct: false, order_index: 1 },
        { id: 'opt-4-c', question_id: 'midterm-mc-4', option_text: 'Vận tải đường bộ bằng xe tải van', is_correct: false, order_index: 2 },
        { id: 'opt-4-d', question_id: 'midterm-mc-4', option_text: 'Chuyển phát nhanh bưu kiện quốc tế', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-5', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 4,
      question_text: 'Chỉ số On-Time In-Full (OTIF) dùng để đo lường điều gì?',
      options: [
        { id: 'opt-5-a', question_id: 'midterm-mc-5', option_text: 'Tỷ lệ đơn hàng được giao đúng giờ và đủ số lượng theo cam kết với khách hàng', is_correct: true, order_index: 0 },
        { id: 'opt-5-b', question_id: 'midterm-mc-5', option_text: 'Tổng chi phí xếp dỡ hàng hóa trên mỗi tấn hàng luân chuyển qua cảng', is_correct: false, order_index: 1 },
        { id: 'opt-5-c', question_id: 'midterm-mc-5', option_text: 'Số ngày bình quân một lô hàng lưu lại trong kho trung chuyển', is_correct: false, order_index: 2 },
        { id: 'opt-5-d', question_id: 'midterm-mc-5', option_text: 'Tỷ lệ hao hụt tự nhiên của hàng nông sản trong quá trình bảo quản lạnh', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-6', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 5,
      question_text: 'Mô hình EOQ (Economic Order Quantity) nhằm tìm điểm cân bằng giữa:',
      options: [
        { id: 'opt-6-a', question_id: 'midterm-mc-6', option_text: 'Chi phí đặt hàng và chi phí lưu kho bảo quản tồn kho', is_correct: true, order_index: 0 },
        { id: 'opt-6-b', question_id: 'midterm-mc-6', option_text: 'Chi phí quảng cáo tiếp thị và doanh thu bán hàng theo tháng', is_correct: false, order_index: 1 },
        { id: 'opt-6-c', question_id: 'midterm-mc-6', option_text: 'Lương nhân viên kho và cước phí bảo hiểm hàng hóa trên đường đi', is_correct: false, order_index: 2 },
        { id: 'opt-6-d', question_id: 'midterm-mc-6', option_text: 'Thời gian sản xuất sản phẩm và thời gian kiểm nghiệm chất lượng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-7', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 6,
      question_text: 'Kỹ thuật Cross-docking trong quản trị kho mang lại lợi ích lớn nhất nào?',
      options: [
        { id: 'opt-7-a', question_id: 'midterm-mc-7', option_text: 'Chuyển hàng trực tiếp từ xe nhận sang xe xuất mà không cần lưu kho trung gian', is_correct: true, order_index: 0 },
        { id: 'opt-7-b', question_id: 'midterm-mc-7', option_text: 'Tăng diện tích kệ lưu kho nhiều tầng để chứa hàng tồn chiến lược', is_correct: false, order_index: 1 },
        { id: 'opt-7-c', question_id: 'midterm-mc-7', option_text: 'Kéo dài thời gian kiểm đếm chi tiết từng linh kiện điện tử', is_correct: false, order_index: 2 },
        { id: 'opt-7-d', question_id: 'midterm-mc-7', option_text: 'Loại bỏ hoàn toàn yêu cầu phải dán mã vạch Barcode trên kiện hàng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-8', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 7,
      question_text: 'Lead Time trong chuỗi cung ứng được định nghĩa là:',
      options: [
        { id: 'opt-8-a', question_id: 'midterm-mc-8', option_text: 'Khoảng thời gian từ lúc đặt hàng đến khi nhận được hàng hoàn chỉnh', is_correct: true, order_index: 0 },
        { id: 'opt-8-b', question_id: 'midterm-mc-8', option_text: 'Thời gian xe tải dừng tại trạm kiểm soát trạm cân tải trọng', is_correct: false, order_index: 1 },
        { id: 'opt-8-c', question_id: 'midterm-mc-8', option_text: 'Tổng thời gian đàm phán hợp đồng thương mại quốc tế', is_correct: false, order_index: 2 },
        { id: 'opt-8-d', question_id: 'midterm-mc-8', option_text: 'Hạn sử dụng ghi trên bao bì của sản phẩm tiêu dùng nhanh', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-9', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 8,
      question_text: 'Khái niệm Safety Stock (Tồn kho an toàn) được thiết lập nhằm mục đích gì?',
      options: [
        { id: 'opt-9-a', question_id: 'midterm-mc-9', option_text: 'Phòng ngừa sự bất định trong nhu cầu thị trường và độ trễ cung ứng từ nhà cung cấp', is_correct: true, order_index: 0 },
        { id: 'opt-9-b', question_id: 'midterm-mc-9', option_text: 'Tận dụng hết không gian trống trên sàn kho trước mùa mưa bão', is_correct: false, order_index: 1 },
        { id: 'opt-9-c', question_id: 'midterm-mc-9', option_text: 'Tránh thuế giá trị gia tăng đối với hàng hóa lưu kho ngắn ngày', is_correct: false, order_index: 2 },
        { id: 'opt-9-d', question_id: 'midterm-mc-9', option_text: 'Giảm số lần thanh tra an toàn phòng cháy chữa cháy của kho', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-10', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 9,
      question_text: 'Triết lý sản xuất Just-In-Time (JIT) cốt lõi tập trung vào:',
      options: [
        { id: 'opt-10-a', question_id: 'midterm-mc-10', option_text: 'Cung cấp đúng chi tiết, đúng số lượng, đúng thời điểm và loại bỏ mọi lãng phí', is_correct: true, order_index: 0 },
        { id: 'opt-10-b', question_id: 'midterm-mc-10', option_text: 'Dự trữ thật nhiều nguyên vật liệu để đề phòng đứt gãy nguồn cung', is_correct: false, order_index: 1 },
        { id: 'opt-10-c', question_id: 'midterm-mc-10', option_text: 'Sử dụng phương thức vận chuyển rẻ nhất bất kể thời gian chậm trễ', is_correct: false, order_index: 2 },
        { id: 'opt-10-d', question_id: 'midterm-mc-10', option_text: 'Ưu tiên gia công hàng loạt lô lớn để giảm chi phí nhân công trực tiếp', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-11', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 10,
      question_text: 'Mã định danh SKU (Stock Keeping Unit) trong quản lý kho hàng được sử dụng để:',
      options: [
        { id: 'opt-11-a', question_id: 'midterm-mc-11', option_text: 'Phân biệt và kiểm soát từng đơn vị hàng hóa cụ thể dựa trên quy cách và đặc tính', is_correct: true, order_index: 0 },
        { id: 'opt-11-b', question_id: 'midterm-mc-11', option_text: 'Đăng ký biển số phương tiện vận tải ra vào cổng tổng kho', is_correct: false, order_index: 1 },
        { id: 'opt-11-c', question_id: 'midterm-mc-11', option_text: 'Tính toán biểu thuế xuất nhập khẩu áp dụng cho từng quốc gia đối tác', is_correct: false, order_index: 2 },
        { id: 'opt-11-d', question_id: 'midterm-mc-11', option_text: 'Xác định số thứ tự ưu tiên của container tại bãi cảng ICD', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-12', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 11,
      question_text: 'Hoạt động Inbound Logistics bao gồm các dòng công việc nào sau đây?',
      options: [
        { id: 'opt-12-a', question_id: 'midterm-mc-12', option_text: 'Tiếp nhận, bốc dỡ, lưu trữ và cung ứng nguyên vật liệu đầu vào cho nhà máy', is_correct: true, order_index: 0 },
        { id: 'opt-12-b', question_id: 'midterm-mc-12', option_text: 'Giao thành phẩm từ kho phân phối đến các siêu thị bán lẻ ngoài thị trường', is_correct: false, order_index: 1 },
        { id: 'opt-12-c', question_id: 'midterm-mc-12', option_text: 'Thu hồi bao bì tái chế và sản phẩm lỗi bảo hành từ người tiêu dùng', is_correct: false, order_index: 2 },
        { id: 'opt-12-d', question_id: 'midterm-mc-12', option_text: 'Tư vấn bán hàng và dịch vụ chăm sóc khách hàng sau khi mua', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-13', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 12,
      question_text: 'Công nghệ RFID (Radio Frequency Identification) mang lại ưu thế vượt trội nào so với Barcode?',
      options: [
        { id: 'opt-13-a', question_id: 'midterm-mc-13', option_text: 'Có thể quét đồng thời nhiều thẻ chip từ xa mà không cần nhìn thấy trực tiếp tia quét', is_correct: true, order_index: 0 },
        { id: 'opt-13-b', question_id: 'midterm-mc-13', option_text: 'Giá thành nhãn giấy in rẻ hơn rất nhiều so với nhãn mã vạch thông thường', is_correct: false, order_index: 1 },
        { id: 'opt-13-c', question_id: 'midterm-mc-13', option_text: 'Không yêu cầu đầu đọc kết nối internet hoặc hệ thống quản lý WMS', is_correct: false, order_index: 2 },
        { id: 'opt-13-d', question_id: 'midterm-mc-13', option_text: 'Hoạt động hiệu quả ngay cả khi bị ngâm hoàn toàn trong chất lỏng dẫn điện', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-14', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 13,
      question_text: 'Hình thức vận tải đa phương thức (Intermodal Transport) sử dụng đơn vị tải chuẩn hóa nào phổ biến nhất?',
      options: [
        { id: 'opt-14-a', question_id: 'midterm-mc-14', option_text: 'Thùng hàng Container tiêu chuẩn ISO', is_correct: true, order_index: 0 },
        { id: 'opt-14-b', question_id: 'midterm-mc-14', option_text: 'Bao tải gai loại 50kg bốc xếp thủ công', is_correct: false, order_index: 1 },
        { id: 'opt-14-c', question_id: 'midterm-mc-14', option_text: 'Thùng phi sắt 200 lít không đóng pallet', is_correct: false, order_index: 2 },
        { id: 'opt-14-d', question_id: 'midterm-mc-14', option_text: 'Hộp carton carton mềm kích thước tự do', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-15', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 14,
      question_text: 'Hệ thống Cold Chain (Chuỗi cung ứng lạnh) giữ vai trò sống còn đối với nhóm ngành hàng nào?',
      options: [
        { id: 'opt-15-a', question_id: 'midterm-mc-15', option_text: 'Dược phẩm, vắc xin sinh học và thực phẩm thủy hải sản tươi sống', is_correct: true, order_index: 0 },
        { id: 'opt-15-b', question_id: 'midterm-mc-15', option_text: 'Sắt thép xây dựng và xi măng đóng bao', is_correct: false, order_index: 1 },
        { id: 'opt-15-c', question_id: 'midterm-mc-15', option_text: 'Hàng dệt may thời trang xuất khẩu đi thị trường châu Âu', is_correct: false, order_index: 2 },
        { id: 'opt-15-d', question_id: 'midterm-mc-15', option_text: 'Sách báo và thiết bị văn phòng phẩm thông dụng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-16', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 15,
      question_text: 'Mô hình VMI (Vendor-Managed Inventory) có đặc điểm cốt lõi là:',
      options: [
        { id: 'opt-16-a', question_id: 'midterm-mc-16', option_text: 'Nhà cung cấp chịu trách nhiệm theo dõi và chủ động bổ sung tồn kho cho khách hàng', is_correct: true, order_index: 0 },
        { id: 'opt-16-b', question_id: 'midterm-mc-16', option_text: 'Khách hàng tự sang kho nhà cung cấp để tự xếp hàng lên xe của mình', is_correct: false, order_index: 1 },
        { id: 'opt-16-c', question_id: 'midterm-mc-16', option_text: 'Chính phủ quy định giá bán và mức tồn trữ tối đa cho từng mặt hàng', is_correct: false, order_index: 2 },
        { id: 'opt-16-d', question_id: 'midterm-mc-16', option_text: 'Các bên không được phép chia sẻ dữ liệu điểm bán POS cho nhau', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-17', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 16,
      question_text: 'Lộ trình thu gom Milk Run trong Logistics được thiết kế như thế nào?',
      options: [
        { id: 'opt-17-a', question_id: 'midterm-mc-17', option_text: 'Một xe chạy theo lộ trình định kỳ ghé thu gom hàng từ nhiều nhà cung cấp theo khung giờ cố định', is_correct: true, order_index: 0 },
        { id: 'opt-17-b', question_id: 'midterm-mc-17', option_text: 'Mỗi nhà cung cấp sử dụng xe riêng của mình chạy thẳng độc lập về nhà máy chính', is_correct: false, order_index: 1 },
        { id: 'opt-17-c', question_id: 'midterm-mc-17', option_text: 'Chỉ thu gom hàng vào ban đêm để tránh tắc đường cao tốc', is_correct: false, order_index: 2 },
        { id: 'opt-17-d', question_id: 'midterm-mc-17', option_text: 'Vận chuyển hàng sữa tươi nguyên chất từ trang trại đến cơ sở chế biến bơ sữa', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-18', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 17,
      question_text: 'Quy trình S&OP (Sales and Operations Planning) đóng vai trò then chốt trong việc:',
      options: [
        { id: 'opt-18-a', question_id: 'midterm-mc-18', option_text: 'Cân đối hài hòa giữa dự báo nhu cầu bán hàng và năng lực vận hành, sản xuất thực tế', is_correct: true, order_index: 0 },
        { id: 'opt-18-b', question_id: 'midterm-mc-18', option_text: 'Tách biệt tuyệt đối bộ phận kinh doanh và phòng kế hoạch sản xuất', is_correct: false, order_index: 1 },
        { id: 'opt-18-c', question_id: 'midterm-mc-18', option_text: 'Cắt giảm tối đa ngân sách đào tạo nội bộ cho đội ngũ nhân viên lái xe nâng', is_correct: false, order_index: 2 },
        { id: 'opt-18-d', question_id: 'midterm-mc-18', option_text: 'Tập trung duy nhất vào báo cáo kết quả tài chính cuối năm tài khóa', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-19', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 18,
      question_text: 'Quy tắc sắp xếp kho hàng ABC (ABC Analysis) dựa trên nguyên lý Pareto phân loại hàng hóa dựa theo:',
      options: [
        { id: 'opt-19-a', question_id: 'midterm-mc-19', option_text: 'Giá trị tiền tệ hoặc tần suất xuất nhập luân chuyển hàng năm của sản phẩm', is_correct: true, order_index: 0 },
        { id: 'opt-19-b', question_id: 'midterm-mc-19', option_text: 'Thứ tự bảng chữ cái tiếng Anh theo tên của thương hiệu sản xuất', is_correct: false, order_index: 1 },
        { id: 'opt-19-c', question_id: 'midterm-mc-19', option_text: 'Màu sắc bao bì bên ngoài của thùng carton đóng gói', is_correct: false, order_index: 2 },
        { id: 'opt-19-d', question_id: 'midterm-mc-19', option_text: 'Trọng lượng tĩnh thuần túy của từng kiện hàng khi nhập cảng', is_correct: false, order_index: 3 },
      ],
    },
    {
      id: 'midterm-mc-20', quiz_id: quizId, question_type: 'multiple_choice', points: 0.2, order_index: 19,
      question_text: 'Chiến lược Reverse Logistics (Logistics ngược) xử lý các dòng vận động nào sau đây?',
      options: [
        { id: 'opt-20-a', question_id: 'midterm-mc-20', option_text: 'Thu hồi sản phẩm hỏng hóc, xử lý hàng trả về, tái chế bao bì và tiêu hủy an toàn', is_correct: true, order_index: 0 },
        { id: 'opt-20-b', question_id: 'midterm-mc-20', option_text: 'Vận chuyển hàng nguyên đai nguyên kiện từ kho trung tâm ra các đại lý cấp 2', is_correct: false, order_index: 1 },
        { id: 'opt-20-c', question_id: 'midterm-mc-20', option_text: 'Thuê kho phụ trợ trong mùa cao điểm mua sắm Tết Nguyên Đán', is_correct: false, order_index: 2 },
        { id: 'opt-20-d', question_id: 'midterm-mc-20', option_text: 'Đặt hàng bổ sung tự động qua cổng điện tử EDI', is_correct: false, order_index: 3 },
      ],
    },
  ];

  const shortQuestions: Question[] = [
    {
      id: 'midterm-short-1', quiz_id: quizId, question_type: 'short_answer', points: 1.0, order_index: 20,
      question_text: '[Câu hỏi ngắn 1 - 1.0 điểm]: Hãy nêu 3 nguyên nhân cốt lõi dẫn đến hiện tượng Bullwhip Effect trong chuỗi cung ứng và đề xuất 1 giải pháp công nghệ để giảm thiểu.',
      options: [],
    },
    {
      id: 'midterm-short-2', quiz_id: quizId, question_type: 'short_answer', points: 1.0, order_index: 21,
      question_text: '[Câu hỏi ngắn 2 - 1.0 điểm]: Phân biệt sự khác nhau giữa 3PL (Third-Party Logistics) và 4PL (Fourth-Party Logistics) về vai trò chiến lược và quản lý tích hợp.',
      options: [],
    },
    {
      id: 'midterm-short-3', quiz_id: quizId, question_type: 'short_answer', points: 1.0, order_index: 22,
      question_text: '[Câu hỏi ngắn 3 - 1.0 điểm]: Một nhà bán lẻ nhận 100 đơn hàng: 95 đơn đúng giờ, nhưng chỉ có 90 đơn vừa đúng giờ vừa đủ số lượng. Hãy tính chỉ số OTIF (%) và giải thích ý nghĩa.',
      options: [],
    },
  ];

  const essayQuestions: Question[] = [
    {
      id: 'midterm-essay-1', quiz_id: quizId, question_type: 'long_answer', points: 3.0, order_index: 23,
      question_text: '[Tự luận dài - 3.0 điểm]: Phân tích ca nghiên cứu (Case Study): Một tập đoàn FMCG tại Việt Nam đang gặp khủng hoảng chi phí logistics chiếm tới 24% doanh thu và tỷ lệ giao trễ hạn 15%. Dựa trên kiến thức về Quản trị Kho bãi (WMS, Cross-docking), Mạng lưới Phân phối và Mô hình S&OP, Thầy/Cô hãy xây dựng kế hoạch tái cấu trúc chuỗi cung ứng toàn diện nhằm đưa chi phí về dưới 14% và nâng OTIF lên trên 98%.',
      options: [],
    },
  ];

  const allQuestions = [...mcQuestions, ...shortQuestions, ...essayQuestions];

  return {
    id: quizId,
    title: 'Đề Thi Giữa Kỳ (Midterm Exam) - Logistics & Supply Chain Management',
    description: 'Đề thi Midterm phân bố chuẩn 3 phần (Thang điểm 10.0): Phần 1: Trắc nghiệm 20 câu (0.2đ x 20 = 4.0đ) | Phần 2: Câu hỏi ngắn 3 câu (1.0đ x 3 = 3.0đ) | Phần 3: Tự luận dài (3.0đ).',
    time_limit_minutes: 60,
    start_at: now.toISOString(),
    end_at: end.toISOString(),
    is_published: true,
    show_results: false,
    shuffle_questions: true,
    shuffle_options: true,
    prevent_previous: true,
    questions_per_student: 24,
    created_at: now.toISOString(),
    questions: allQuestions,
  };
}

const DEFAULT_QUIZZES: Quiz[] = [];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.QUIZZES) || localStorage.getItem('uni_quiz_testbank_v1');
  if (!stored) {
    const initial = [createDefaultMidtermQuiz()];
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(initial));
    return initial;
  }
  try {
    let parsed: Quiz[] = JSON.parse(stored);
    localStorage.removeItem('uni_quiz_testbank_v1');

    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [createDefaultMidtermQuiz()];
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(initial));
      return initial;
    }

    return parsed;
  } catch (e) {
    return [createDefaultMidtermQuiz()];
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
