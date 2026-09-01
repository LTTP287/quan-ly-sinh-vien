'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Lock, ShieldAlert, ArrowRight, Home, GraduationCap } from 'lucide-react';

export default function ExamResultPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const violations = searchParams.get('violations') || '0';
  const reason = searchParams.get('reason') || '';

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
            <p className="text-xs text-slate-400 mt-1">Bài Kiểm Tra Giữa Kỳ - React & Next.js App Router</p>
          </div>

          {reason && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              {reason}
            </div>
          )}

          {/* Privacy Locked Grade Notice */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>Kết Quả Đang Được Bảo Mật</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Theo quy định của Giảng viên, điểm số và đáp án chi tiết tạm thời <strong>được ẩn</strong> để tránh lộ đáp án cho các lớp thi ở khung giờ sau.
            </p>
            <p className="text-[11px] text-slate-400">
              * Thầy/Cô sẽ công bố kết quả trên hệ thống sau khi tất cả các ca thi kết thúc.
            </p>
          </div>

          {/* Anti-Cheat Summary */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Ghi nhận số lần vi phạm chuyển tab:</span>
            </span>
            <strong className={Number(violations) > 0 ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}>
              {violations} lần
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
