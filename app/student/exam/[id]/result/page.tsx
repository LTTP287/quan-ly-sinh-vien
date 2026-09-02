'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getQuiz } from '@/lib/data';
import { Quiz } from '@/types/database';

interface MyResult {
  found: boolean;
  showResults: boolean;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  violations: number;
}
import { CheckCircle2, Lock, ShieldAlert, ArrowRight, Home, GraduationCap } from 'lucide-react';

export default function ExamResultPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const violations = searchParams.get('violations') || '0';
  const reason = searchParams.get('reason') || '';
  const score = searchParams.get('score');
  const correct = searchParams.get('correct');
  const total = searchParams.get('total');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);

  useEffect(() => {
    (async () => {
      setQuiz(await getQuiz(params.id));

      // Nguồn sự thật là server: điểm chỉ về khi Giảng viên đã công bố,
      // sửa query string trên URL cũng không xem trộm được điểm.
      try {
        const res = await fetch(`/api/exam/result?quiz_id=${encodeURIComponent(params.id)}`, {
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));

        if (json.mode === 'remote' && json.result?.found) {
          setResult({
            found: true,
            showResults: json.result.show_results,
            score: json.result.score,
            correctCount: json.result.correct_count,
            totalQuestions: json.result.total_questions || 0,
            violations: json.result.violations || 0,
          });
        }
        // Chế độ demo: server không giữ điểm, dùng lại giá trị đã gắn vào URL
        // lúc nộp bài (đã được lọc theo show_results ngay tại đó).
      } catch {
        /* giữ giá trị từ query string */
      }
    })();
  }, [params.id]);

  const canSeeScore = !!result?.showResults && result?.score !== null && result?.score !== undefined;
  const shownScore = result?.score ?? score;
  const shownCorrect = result?.correctCount ?? correct;
  const shownTotal = result?.totalQuestions ?? total;
  const shownViolations = result?.violations ?? Number(violations);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-10 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="p-4 w-fit mx-auto rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white">Nộp Bài Thi Thành Công!</h1>
            <p className="text-xs text-slate-400 mt-1">{quiz?.title || 'Bài kiểm tra'}</p>
          </div>

          {reason && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              {reason}
            </div>
          )}

          {canSeeScore ? (
            /* Grade Released by Lecturer */
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Điểm Bài Thi (thang 10)</p>
              <p className="text-5xl font-extrabold text-white font-mono">{shownScore}</p>
              <p className="text-xs text-slate-400">
                Trả lời đúng <strong className="text-white">{shownCorrect}</strong> / {shownTotal} câu được rút từ ngân hàng đề.
              </p>
            </div>
          ) : (
            /* Privacy Locked Grade Notice */
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>Kết Quả Đang Được Bảo Mật</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bài làm của bạn đã được chấm và lưu lại. Theo quy định của Giảng viên, điểm số và đáp án chi tiết tạm thời <strong>được ẩn</strong> để tránh lộ đáp án cho các lớp thi ở khung giờ sau.
              </p>
              <p className="text-[11px] text-slate-400">
                * Thầy/Cô sẽ công bố kết quả trên hệ thống sau khi tất cả các ca thi kết thúc.
              </p>
            </div>
          )}

          {/* Anti-Cheat Summary */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Ghi nhận số lần vi phạm chuyển tab:</span>
            </span>
            <strong className={shownViolations > 0 ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}>
              {shownViolations} lần
            </strong>
          </div>

          <Link
            href="/student/dashboard"
            className="w-full gradient-button py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Quay Về Trang Sinh Viên</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
