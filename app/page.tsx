'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles, User, Calendar, KeyRound, AlertCircle,
  Zap, Award, GraduationCap, ArrowRight, CheckCircle2, Shield
} from 'lucide-react';
import { signInStudent, joinInClassExam } from '@/lib/data';

export default function Home() {
  const router = useRouter();
  // Mode 1: 'in_class' (Vào Thi Tại Lớp), Mode 2: 'lookup' (Tra Cứu Điểm)
  const [activeMode, setActiveMode] = useState<'in_class' | 'lookup'>('in_class');

  // Form State
  const [studentCode, setStudentCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [dob, setDob] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xử lý nộp form Mode 1: Vào Thi Tại Lớp (MSSV + Mã phòng thi)
  const handleInClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = studentCode.trim();
    if (!cleanCode) {
      setErrorMessage('Vui lòng nhập Mã sinh viên (MSSV) của bạn.');
      return;
    }

    setLoading(true);
    try {
      const res = await joinInClassExam(cleanCode, passcode.trim());
      if (res.success) {
        router.push(res.redirect || '/student/dashboard');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Không tìm thấy bài thi hoặc mã phòng thi không đúng.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ phòng thi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý nộp form Mode 2: Tra Cứu Điểm (MSSV + Ngày sinh DDMMYYYY)
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = studentCode.trim();
    const cleanDob = dob.trim();

    if (!cleanCode) {
      setErrorMessage('Vui lòng nhập Mã sinh viên (MSSV).');
      return;
    }
    if (!cleanDob) {
      setErrorMessage('Vui lòng nhập Ngày sinh (ví dụ: 15/01/2004 hoặc 15012004).');
      return;
    }

    setLoading(true);
    try {
      const res = await signInStudent(cleanCode, cleanDob);
      if (res.success) {
        router.push(res.redirect || '/student/dashboard');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Mã sinh viên hoặc ngày sinh không đúng.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/80 via-yellow-50/40 to-emerald-50/40 text-slate-800 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-yellow-300 selection:text-slate-900">
      {/* Background Decorative Soft Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-yellow-300/25 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-soft" />
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-20 -right-20 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Floating Lemon & Drink Badges */}
      <div className="hidden lg:block absolute top-20 left-12 animate-float-lemon pointer-events-none">
        <div className="bg-white/85 backdrop-blur-md border border-yellow-200 shadow-md shadow-yellow-500/10 px-4 py-2 rounded-full text-xs font-bold text-amber-700 flex items-center space-x-2">
          <span className="text-base">🍋</span>
          <span>100% Chanh Tươi Đã Khát</span>
        </div>
      </div>

      <div className="hidden lg:block absolute top-36 right-14 animate-float-reverse pointer-events-none">
        <div className="bg-white/85 backdrop-blur-md border border-emerald-200 shadow-md shadow-emerald-500/10 px-4 py-2 rounded-full text-xs font-bold text-emerald-700 flex items-center space-x-2">
          <span className="text-base">🍹</span>
          <span>Squeeze It, Score 10!</span>
        </div>
      </div>

      {/* Hero Section */}
      <header className="text-center px-4 max-w-4xl mx-auto space-y-4 pt-10 sm:pt-14 relative z-10">
        {/* Playful Gen-Z Pill Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/90 border border-yellow-300/80 shadow-sm text-xs font-bold text-amber-800 animate-float-lemon-slow">
          <span className="inline-block animate-spin text-sm" style={{ animationDuration: '6s' }}>🍋</span>
          <span>UniQuiz Hub · Phiên Bản Lemonade Fresh Vibe</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-black">Gen-Z</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-amber-600 via-yellow-500 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
            Squeeze The Quizzes 🍋
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-xl font-medium text-slate-600 max-w-xl mx-auto leading-relaxed">
          When School Gives You Quizzes... <br className="hidden sm:inline" />
          <span className="font-extrabold text-amber-600">Make Lemonade! 🍹</span>{' '}
          <span className="text-slate-500 text-sm sm:text-base font-normal">(Học + Hỏi + Hiểu = 10 điểm trọn vẹn)</span>
        </p>

        {/* Illustration with Glowing Soft Lemon Border */}
        <div className="pt-2 flex justify-center">
          <div className="relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-300/40 via-amber-300/40 to-emerald-300/30 rounded-3xl blur-md group-hover:blur-lg transition duration-300"></div>
            <img
              src="/lemonade.jpg"
              alt="Squeeze The Quizzes - Make It Lemonade"
              className="relative w-48 sm:w-60 md:w-68 h-auto rounded-3xl shadow-xl border-4 border-white object-cover"
            />
            {/* Mascot Mini Chip */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white/95 border border-yellow-300 shadow-md shadow-yellow-500/20 px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 whitespace-nowrap flex items-center space-x-1">
              <span>🍋</span>
              <span>Chấm điểm tức thì & Thi trực tiếp</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interaction Area: Glassmorphic Center Card */}
      <section className="my-8 w-full max-w-md mx-auto px-4 z-10">
        <div className="lemon-glass-card p-6 sm:p-8 rounded-3xl space-y-6">
          {/* Tabs Switching System: Mode 1 & Mode 2 */}
          <div className="grid grid-cols-2 p-1.5 bg-yellow-100/60 border border-yellow-200/80 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveMode('in_class');
                setErrorMessage(null);
              }}
              className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                activeMode === 'in_class'
                  ? 'bg-white text-slate-900 shadow-md shadow-yellow-500/10 border border-yellow-200/70 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeMode === 'in_class' ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
              <span>Vào Thi Tại Lớp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('lookup');
                setErrorMessage(null);
              }}
              className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all duration-200 ${
                activeMode === 'lookup'
                  ? 'bg-white text-slate-900 shadow-md shadow-yellow-500/10 border border-yellow-200/70 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Award className={`w-4 h-4 ${activeMode === 'lookup' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Tra Cứu Điểm</span>
            </button>
          </div>

          {/* Mode Descriptions */}
          <div className="text-center">
            {activeMode === 'in_class' ? (
              <div>
                <h2 className="text-base font-extrabold text-slate-800 flex items-center justify-center space-x-1.5">
                  <span>Nhập Mã Phòng Thi Tại Lớp</span>
                  <span className="text-base">⚡</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Nhập MSSV và Mã phòng do Thầy/Cô đọc để vào thẳng đề thi
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-base font-extrabold text-slate-800 flex items-center justify-center space-x-1.5">
                  <span>Tra Cứu Bảng Điểm Cá Nhân</span>
                  <span className="text-base">📊</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đăng nhập bằng MSSV & Ngày sinh để xem điểm tất cả bài Quiz
                </p>
              </div>
            )}
          </div>

          {/* Error Alert Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5 animate-pulse-soft">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Mode 1 Form: Vào Thi Tại Lớp */}
          {activeMode === 'in_class' && (
            <form onSubmit={handleInClassSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mã Sinh Viên (MSSV)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/70" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 123456789"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full bg-white border border-yellow-200/90 hover:border-yellow-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-yellow-400/30 focus:border-yellow-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mã Phòng Thi (Room PIN)
                  </label>
                  <span className="text-[11px] text-slate-400 italic">Để trống nếu bài không đặt PIN</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/70" />
                  <input
                    type="text"
                    placeholder="Ví dụ: SCM201 hoặc PIN"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full bg-white border border-yellow-200/90 hover:border-yellow-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-yellow-400/30 focus:border-yellow-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-800 uppercase placeholder-slate-400 font-mono tracking-wider transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Main Submit Button (CTA) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/35 hover:shadow-yellow-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang kết nối phòng thi...</span>
                  </span>
                ) : (
                  <>
                    <span>Vắt Sạch Điểm Số! Vào Thi Ngay</span>
                    <span className="text-base">🍋</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Chế độ thi bảo mật · Tự động xáo trộn đề & đáp án</span>
                </p>
              </div>
            </form>
          )}

          {/* Mode 2 Form: Tra Cứu Điểm */}
          {activeMode === 'lookup' && (
            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mã Sinh Viên (MSSV)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/70" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 123456789"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full bg-white border border-emerald-200/90 hover:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ngày Sinh (Mật khẩu: DDMMYYYY)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/70" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Ví dụ: 15/01/2004 hoặc 15012004"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    maxLength={10}
                    className="w-full bg-white border border-emerald-200/90 hover:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-800 placeholder-slate-400 font-mono transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Main Submit Button (CTA) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:via-teal-300 hover:to-emerald-300 text-slate-950 shadow-lg shadow-emerald-400/35 hover:shadow-emerald-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang tải bảng điểm...</span>
                  </span>
                ) : (
                  <>
                    <span>Tra Cứu Điểm Số Của Tôi</span>
                    <span className="text-base">🍹</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Xem lịch sử bài thi, điểm chữ, xếp loại & nhận xét</span>
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer: Minimalistic, Low-opacity Lecturer link */}
      <footer className="w-full text-center py-6 px-4 text-xs text-slate-500 space-y-2.5 z-10 border-t border-yellow-200/60 bg-white/40 backdrop-blur-sm">
        <div>
          <Link
            href="/login/lecturer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-yellow-200/50 transition-all duration-200 group"
          >
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            <span className="font-medium">Giảng viên đăng nhập 🎓</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">
          Squeeze The Quizzes · Built with 💛 for Students & Faculty · <span className="font-semibold text-slate-600">ThS. Lê Thị Thanh Phương</span>
        </p>
      </footer>
    </main>
  );
}
