'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, ShieldAlert, AlertTriangle, CheckCircle2, 
  ArrowRight, ArrowLeft, Send, Sparkles, AlertCircle, Lock, ShieldBan, Dice5 
} from 'lucide-react';
import { Question, Quiz } from '@/types/database';

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StudentExamRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Exam Meta State
  const [quiz] = useState<Quiz>({
    id: params.id,
    class_id: 'class-1',
    title: 'Bài Kiểm Tra Giữa Kỳ - React & Next.js App Router',
    description: 'Bài kiểm tra rút ngẫu nhiên 5 câu hỏi từ ngân hàng đề.',
    time_limit_minutes: 45,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    is_published: true,
    show_results: false, // Hidden until Lecturer releases grades
    shuffle_questions: true,
    shuffle_options: true, // Trộn đáp án A, B, C, D
    prevent_previous: true, // Khóa không cho quay lại câu trước
    questions_per_student: 5, // Mỗi SV rút ngẫu nhiên 5 câu từ ngân hàng đề
    created_at: new Date().toISOString(),
  });

  // Raw Unshuffled Questions Mock Bank (6 câu trong ngân hàng đề)
  const rawQuestionBank = useMemo<Question[]>(
    () => [
      {
        id: 'q-1',
        quiz_id: params.id,
        question_text: 'Đâu là đặc điểm chính của Server-Side Rendering (SSR) trong Next.js App Router?',
        question_type: 'multiple_choice',
        points: 2.0,
        order_index: 0,
        options: [
          { id: 'opt-1', question_id: 'q-1', option_text: 'Tạo sẵn HTML trên Server cho mỗi request từ Client', is_correct: true, order_index: 0 },
          { id: 'opt-2', question_id: 'q-1', option_text: 'Chỉ tạo HTML một lần duy nhất ở thời điểm build code', is_correct: false, order_index: 1 },
          { id: 'opt-3', question_id: 'q-1', option_text: 'Chạy toàn bộ logic ở phía Browser người dùng', is_correct: false, order_index: 2 },
          { id: 'opt-4', question_id: 'q-1', option_text: 'Không cho phép truy vấn cơ sở dữ liệu', is_correct: false, order_index: 3 },
        ],
      },
      {
        id: 'q-2',
        quiz_id: params.id,
        question_text: 'Cơ chế Row Level Security (RLS) của Supabase bảo mật dữ liệu ở cấp độ bảng PostgreSQL.',
        question_type: 'true_false',
        points: 2.0,
        order_index: 1,
        options: [
          { id: 'opt-tf-1', question_id: 'q-2', option_text: 'Đúng', is_correct: true, order_index: 0 },
          { id: 'opt-tf-2', question_id: 'q-2', option_text: 'Sai', is_correct: false, order_index: 1 },
        ],
      },
      {
        id: 'q-3',
        quiz_id: params.id,
        question_text: 'Hook nào trong React được sử dụng để quản lý Side Effects như gọi API hoặc đăng ký event listener?',
        question_type: 'multiple_choice',
        points: 2.0,
        order_index: 2,
        options: [
          { id: 'opt-3-1', question_id: 'q-3', option_text: 'useState', is_correct: false, order_index: 0 },
          { id: 'opt-3-2', question_id: 'q-3', option_text: 'useEffect', is_correct: true, order_index: 1 },
          { id: 'opt-3-3', question_id: 'q-3', option_text: 'useContext', is_correct: false, order_index: 2 },
          { id: 'opt-3-4', question_id: 'q-3', option_text: 'useMemo', is_correct: false, order_index: 3 },
        ],
      },
      {
        id: 'q-4',
        quiz_id: params.id,
        question_text: 'Giao thức HTTP/2 hoặc HTTP/3 giúp tối ưu hóa ứng dụng nhờ khả năng truyền nhiều request đồng thời trên 1 kết nối.',
        question_type: 'true_false',
        points: 2.0,
        order_index: 3,
        options: [
          { id: 'opt-4-1', question_id: 'q-4', option_text: 'Đúng', is_correct: true, order_index: 0 },
          { id: 'opt-4-2', question_id: 'q-4', option_text: 'Sai', is_correct: false, order_index: 1 },
        ],
      },
      {
        id: 'q-5',
        quiz_id: params.id,
        question_text: 'Thư viện nào thường được dùng để quản lý Form state và validate dữ liệu mượt mà trong React?',
        question_type: 'multiple_choice',
        points: 2.0,
        order_index: 4,
        options: [
          { id: 'opt-5-1', question_id: 'q-5', option_text: 'React Hook Form', is_correct: true, order_index: 0 },
          { id: 'opt-5-2', question_id: 'q-5', option_text: 'Redux Toolkit', is_correct: false, order_index: 1 },
          { id: 'opt-5-3', question_id: 'q-5', option_text: 'Axios', is_correct: false, order_index: 2 },
          { id: 'opt-5-4', question_id: 'q-5', option_text: 'TailwindCSS', is_correct: false, order_index: 3 },
        ],
      },
      {
        id: 'q-6',
        quiz_id: params.id,
        question_text: 'Thuộc tính CSS nào định nghĩa số cột và kích thước các cột trong CSS Grid Layout?',
        question_type: 'multiple_choice',
        points: 2.0,
        order_index: 5,
        options: [
          { id: 'opt-6-1', question_id: 'q-6', option_text: 'grid-template-columns', is_correct: true, order_index: 0 },
          { id: 'opt-6-2', question_id: 'q-6', option_text: 'flex-direction', is_correct: false, order_index: 1 },
          { id: 'opt-6-3', question_id: 'q-6', option_text: 'align-items', is_correct: false, order_index: 2 },
          { id: 'opt-6-4', question_id: 'q-6', option_text: 'grid-auto-flow', is_correct: false, order_index: 3 },
        ],
      },
    ],
    [params.id]
  );

  // Shuffled and Randomly Sampled Questions per Student
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    // 1. Rút ngẫu nhiên N câu hỏi từ ngân hàng đề cho sinh viên này
    let sampled = [...rawQuestionBank];
    if (quiz.questions_per_student && quiz.questions_per_student < rawQuestionBank.length) {
      sampled = shuffleArray(rawQuestionBank).slice(0, quiz.questions_per_student);
    } else if (quiz.shuffle_questions) {
      sampled = shuffleArray(rawQuestionBank);
    }

    // 2. Trộn thứ tự các phương án lựa chọn (A, B, C, D) cho từng câu
    if (quiz.shuffle_options) {
      sampled = sampled.map((q) => ({
        ...q,
        options: q.options ? shuffleArray(q.options) : [],
      }));
    }

    setQuestions(sampled);
  }, [rawQuestionBank, quiz.questions_per_student, quiz.shuffle_questions, quiz.shuffle_options]);

  // Exam Interactive State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(quiz.time_limit_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-Cheat Violation Engine
  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      handleAutoSubmit('Hết giờ làm bài thi!');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  // Anti-Cheat Tab Switching Detection Effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Phát hiện chuyển tab hoặc thu nhỏ cửa sổ làm bài!');
      }
    };

    const handleBlur = () => {
      triggerViolation('Phát hiện chuột rời khỏi màn hình bài thi!');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [violationsCount]);

  const triggerViolation = (reason: string) => {
    const newCount = violationsCount + 1;
    setViolationsCount(newCount);
    setShowWarningModal(true);

    if (newCount >= 3) {
      handleAutoSubmit('Tự động nộp bài do vi phạm chuyển tab quá 3 lần!');
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const goToNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentQuestionIndex(nextIdx);
      if (nextIdx > maxVisitedIndex) {
        setMaxVisitedIndex(nextIdx);
      }
    }
  };

  const handleAutoSubmit = (reason?: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      router.push(`/student/exam/${params.id}/result?violations=${violationsCount}&reason=${encodeURIComponent(reason || '')}`);
    }, 1000);
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const currentQ = questions[currentQuestionIndex];

  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Top Fixed Header with Timer */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base text-white">{quiz.title}</h1>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center space-x-1 text-purple-400 font-semibold">
                <Dice5 className="w-3.5 h-3.5" />
                <span>Rút ngẫu nhiên {questions.length} câu từ Ngân hàng đề</span>
              </span>
              {quiz.prevent_previous && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center space-x-1">
                  <ShieldBan className="w-3 h-3" />
                  <span>Khóa câu trước</span>
                </span>
              )}
            </div>
          </div>

          {/* Countdown Timer Display */}
          <div className="flex items-center space-x-6">
            {/* Violations Counter */}
            {violationsCount > 0 && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Vi phạm: {violationsCount}/3</span>
              </div>
            )}

            <div className="flex items-center space-x-2 bg-slate-900/90 border border-purple-500/40 px-4 py-2 rounded-xl text-purple-400 font-mono font-bold text-lg shadow-lg">
              <Clock className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={() => handleAutoSubmit()}
              disabled={isSubmitting}
              className="gradient-button px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài Thi</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Exam Body */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Question Content (Left Column - 3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Câu {currentQuestionIndex + 1} / {questions.length}
              </span>
              <span className="text-xs text-slate-400">
                Thang điểm: <strong>{currentQ.points} điểm</strong>
              </span>
            </div>

            {/* Question Text */}
            <h2 className="text-lg font-semibold text-white leading-relaxed">
              {currentQ.question_text}
            </h2>

            {/* Options List (Shuffled Options A, B, C, D) */}
            <div className="space-y-3 pt-4">
              {currentQ.options?.map((opt, optIdx) => {
                const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D
                const isSelected = selectedAnswers[currentQ.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 text-white shadow-md'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                        isSelected ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {optionLabel}
                      </span>
                      <span className="text-sm font-medium">{opt.option_text}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            {/* Previous Question Button */}
            <button
              disabled={quiz.prevent_previous || currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="px-5 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 flex items-center space-x-2"
              title={quiz.prevent_previous ? 'Không thể quay lại câu hỏi trước' : ''}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu Trước {quiz.prevent_previous && '(Đã khóa)'}</span>
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={goToNextQuestion}
                className="gradient-button px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2"
              >
                <span>Xác Nhận & Qua Câu Tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleAutoSubmit()}
                className="gradient-button px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500"
              >
                <span>Hoàn Thành & Nộp Bài Thi</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Question Palette (Right Column - 1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Danh Sách Câu Hỏi ({questions.length} câu)
            </h3>

            <div className="grid grid-cols-4 gap-2.5">
              {questions.map((q, idx) => {
                const isAnswered = !!selectedAnswers[q.id];
                const isCurrent = idx === currentQuestionIndex;
                const isLockedPast = quiz.prevent_previous && idx < currentQuestionIndex;

                return (
                  <button
                    key={q.id}
                    disabled={isLockedPast || (quiz.prevent_previous && idx > currentQuestionIndex + 1)}
                    onClick={() => {
                      if (!isLockedPast) {
                        setCurrentQuestionIndex(idx);
                        if (idx > maxVisitedIndex) setMaxVisitedIndex(idx);
                      }
                    }}
                    className={`h-11 rounded-xl font-mono text-xs font-bold transition-all border flex items-center justify-center ${
                      isCurrent
                        ? 'border-purple-500 bg-purple-600 text-white ring-2 ring-purple-500/40'
                        : isLockedPast
                        ? 'border-slate-800 bg-slate-950 text-slate-600 cursor-not-allowed opacity-50'
                        : isAnswered
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isLockedPast ? <Lock className="w-3.5 h-3.5" /> : idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-purple-600 border border-purple-500" />
                <span>Câu đang làm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" />
                <span>Đã trả lời</span>
              </div>
              {quiz.prevent_previous && (
                <div className="flex items-center space-x-2 text-red-400 font-medium">
                  <Lock className="w-3 h-3" />
                  <span>Đã khóa không được quay lại</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ANTI-CHEAT VIOLATION WARNING MODAL */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border border-amber-500/40 w-full max-w-md text-center space-y-6 animate-pulse-warning">
            <div className="p-4 w-fit mx-auto rounded-full bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-amber-400">CẢNH BÁO VI PHẠM THI</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Hệ thống phát hiện bạn vừa <strong>chuyển tab hoặc rời màn hình</strong> bài thi!
              </p>
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm">
                Số lần vi phạm: {violationsCount} / 3
              </div>
            </div>

            <p className="text-xs text-slate-400">
              * Nếu tiếp tục vi phạm quá 3 lần, bài thi của bạn sẽ <strong>tự động nộp ngay lập tức</strong>.
            </p>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full gradient-button py-3 rounded-xl text-sm font-semibold"
            >
              Tôi Đã Hiểu - Tiếp Tục Làm Bài
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
