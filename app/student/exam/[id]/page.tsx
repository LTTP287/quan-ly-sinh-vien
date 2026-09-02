'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, ShieldAlert, AlertTriangle, ArrowRight, ArrowLeft, Send,
  AlertCircle, Lock, ShieldBan, Dice5,
} from 'lucide-react';
import { Question, Quiz, Submission, UserProfile } from '@/types/database';
import { getQuiz, getCurrentUser, saveSubmissionLocal } from '@/lib/data';
import { gradeSubmission } from '@/lib/grading';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type LoadState = 'loading' | 'ready' | 'error';
type LoadReason =
  | 'NO_TICKET'
  | 'ALREADY_SUBMITTED'
  | 'NOT_FOUND'
  | 'NO_QUESTIONS'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<LoadReason, string> = {
  NO_TICKET: 'Bạn cần quay lại Bảng điều khiển và nhập Mã phòng thi trước khi vào làm bài.',
  ALREADY_SUBMITTED: 'Bạn đã nộp bài thi này rồi.',
  NOT_FOUND: 'Không tìm thấy bài thi này.',
  NO_QUESTIONS: 'Đề thi chưa có câu hỏi nào trong Ngân hàng đề.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn hoặc bị thay thế ở thiết bị khác.',
  UNKNOWN: 'Không mở được phòng thi. Vui lòng thử lại.',
};

export default function StudentExamRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadReason, setLoadReason] = useState<LoadReason>('UNKNOWN');
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const [isRemoteExam, setIsRemoteExam] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [violationsCount, setViolationsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const violationKey = `exam_violations_${params.id}`;

  // Đổi "vé vào phòng thi" (được cấp sau khi xác thực Mã phòng thi ở Dashboard)
  // lấy đề. Không có vé hợp lệ -> không lấy được đề, kể cả gõ thẳng URL.
  useEffect(() => {
    (async () => {
      setStudent(await getCurrentUser());

      const res = await fetch('/api/exam/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: params.id }),
      });

      if (res.status === 401) {
        setLoadReason('SESSION_EXPIRED');
        setLoadState('error');
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadReason((json.reason as LoadReason) || 'UNKNOWN');
        setLoadState('error');
        return;
      }

      if (json.mode === 'remote' && json.paper) {
        const p = json.paper;
        setIsRemoteExam(true);
        setSubmissionId(p.submission_id);
        setQuiz({
          id: p.quiz.id,
          title: p.quiz.title,
          description: p.quiz.description,
          time_limit_minutes: p.quiz.time_limit_minutes,
          prevent_previous: p.quiz.prevent_previous,
          show_results: p.quiz.show_results,
          start_at: '',
          end_at: '',
          is_published: true,
          shuffle_questions: false,
          shuffle_options: false,
          created_at: '',
        });
        setQuestions(
          (p.questions as any[]).map((q, idx) => ({
            id: q.id,
            quiz_id: params.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            order_index: idx,
            options: (q.options || []).map((o: any, oi: number) => ({
              id: o.id,
              question_id: q.id,
              option_text: o.option_text,
              is_correct: false,
              order_index: oi,
            })),
          }))
        );
        setTimeLeftSeconds(p.quiz.time_limit_minutes * 60);
        setViolationsCount(Math.max(p.tab_violations_count || 0, Number(localStorage.getItem(violationKey) || 0)));
        setLoadState('ready');
        return;
      }

      // Chế độ demo: đề thi vẫn nằm trong Test Bank ở localStorage (được
      // Giảng viên tạo qua /lecturer/quizzes/new). Vé chỉ xác nhận sinh viên
      // đã qua bước nhập Mã phòng thi hợp lệ.
      const found = await getQuiz(params.id);
      const bank = found?.questions || [];
      if (!found) {
        setLoadReason('NOT_FOUND');
        setLoadState('error');
        return;
      }
      if (bank.length === 0) {
        setLoadReason('NO_QUESTIONS');
        setLoadState('error');
        return;
      }

      let sampled = [...bank];
      if (found.questions_per_student && found.questions_per_student < bank.length) {
        sampled = shuffleArray(bank).slice(0, found.questions_per_student);
      } else if (found.shuffle_questions) {
        sampled = shuffleArray(bank);
      }
      if (found.shuffle_options) {
        sampled = sampled.map((q) => ({ ...q, options: q.options ? shuffleArray(q.options) : [] }));
      }

      setQuiz(found);
      setQuestions(sampled);
      setTimeLeftSeconds(found.time_limit_minutes * 60);
      setViolationsCount(Number(localStorage.getItem(violationKey) || 0));
      setLoadState('ready');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (loadState !== 'ready' || isSubmitting) return;
    if (timeLeftSeconds <= 0) {
      handleAutoSubmit('Hết giờ làm bài thi!');
      return;
    }
    const timer = setInterval(() => setTimeLeftSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSeconds, loadState, isSubmitting]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) triggerViolation('Phát hiện chuyển tab hoặc thu nhỏ cửa sổ làm bài!');
    };
    const handleBlur = () => triggerViolation('Phát hiện chuột rời khỏi màn hình bài thi!');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationsCount]);

  const triggerViolation = (reason: string) => {
    const newCount = violationsCount + 1;
    setViolationsCount(newCount);
    setShowWarningModal(true);
    localStorage.setItem(violationKey, String(newCount));

    fetch('/api/exam/violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: params.id, message: reason }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (typeof json.count === 'number' && json.count > newCount) setViolationsCount(json.count);
      })
      .catch(() => {});

    if (newCount >= 3) handleAutoSubmit('Tự động nộp bài do vi phạm chuyển tab quá 3 lần!');
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const goToNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentQuestionIndex(nextIdx);
      if (nextIdx > maxVisitedIndex) setMaxVisitedIndex(nextIdx);
    }
  };

  const handleAutoSubmit = async (reason?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timedOut = !!reason && reason.includes('Hết giờ');

    try {
      const answers = questions.map((q) => ({
        question_id: q.id,
        option_id: selectedAnswers[q.id] || null,
      }));

      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: params.id, answers, violations: violationsCount, timed_out: timedOut }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Nộp bài thất bại.');

      let showResults = false;
      let score: number | null = null;
      let correctCount: number | null = null;
      let totalQuestions = questions.length;

      if (json.mode === 'remote' && json.result) {
        showResults = json.result.show_results;
        score = json.result.score;
        correctCount = json.result.correct_count;
        totalQuestions = json.result.total_questions;
      } else {
        // Demo: chấm tại chỗ và lưu vào Test Bank để trang Thống kê điểm đọc được
        const result = gradeSubmission(questions, selectedAnswers, `sub-${params.id}-${student?.id || 'guest'}`);
        const submission: Submission = {
          id: `sub-${params.id}-${student?.id || 'guest'}`,
          quiz_id: params.id,
          student_id: student?.id || 'guest',
          started_at: startedAt,
          submitted_at: new Date().toISOString(),
          total_score: result.score10,
          status: timedOut ? 'timed_out' : 'submitted',
          tab_violations_count: violationsCount,
          answers: result.answers,
          student: student || undefined,
        };
        saveSubmissionLocal(submission);
        showResults = !!quiz?.show_results;
        score = result.score10;
        correctCount = result.correctCount;
        totalQuestions = result.totalQuestions;
      }

      localStorage.removeItem(violationKey);

      const query = new URLSearchParams({ violations: String(violationsCount), reason: reason || '' });
      if (showResults && score !== null) {
        query.set('score', String(score));
        query.set('correct', String(correctCount ?? ''));
        query.set('total', String(totalQuestions));
      }
      router.push(`/student/exam/${params.id}/result?${query.toString()}`);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Nộp bài thất bại: ${err?.message || err}`);
    }
  };

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const currentQ = questions[currentQuestionIndex];

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        <p className="text-sm">Đang tải đề thi...</p>
      </div>
    );
  }

  if (loadState === 'error' || !quiz || !currentQ) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="glass-card p-8 rounded-2xl border border-slate-800 max-w-md text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-lg font-bold">Không mở được phòng thi</h1>
          <p className="text-sm text-slate-400">{ERROR_MESSAGES[loadReason]}</p>
          <button
            onClick={() =>
              router.push(loadReason === 'SESSION_EXPIRED' ? '/login/student' : '/student/dashboard')
            }
            className="gradient-button px-5 py-2.5 rounded-xl text-sm font-bold"
          >
            {loadReason === 'SESSION_EXPIRED' ? 'Đăng nhập lại' : 'Quay lại Bảng điều khiển'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
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

          <div className="flex items-center space-x-6">
            {violationsCount > 0 && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Vi phạm: {violationsCount}/3</span>
              </div>
            )}

            <div className="flex items-center space-x-2 bg-slate-900/90 border border-purple-500/40 px-4 py-2 rounded-xl text-purple-400 font-mono font-bold text-lg shadow-lg">
              <Clock className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
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

      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
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

            <h2 className="text-lg font-semibold text-white leading-relaxed">{currentQ.question_text}</h2>

            <div className="space-y-3 pt-4">
              {currentQ.options?.map((opt, optIdx) => {
                const optionLabel = String.fromCharCode(65 + optIdx);
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
                      <span
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                          isSelected ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
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

          <div className="flex items-center justify-between">
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

      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border border-amber-500/40 w-full max-w-md text-center space-y-6">
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
