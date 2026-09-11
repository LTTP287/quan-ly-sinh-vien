'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, UserCheck, Sparkles, User, Calendar, Mail, KeyRound, AlertCircle } from 'lucide-react';
import { signInStudent, signInLecturer } from '@/lib/data';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'student' | 'lecturer'>('student');

  // Student Form State
  const [studentCode, setStudentCode] = useState('');
  const [dob, setDob] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Lecturer Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lecturerLoading, setLecturerLoading] = useState(false);
  const [lecturerError, setLecturerError] = useState<string | null>(null);

  const handleDobChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDob(formatted);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    const digits = dob.replace(/\D/g, '');
    if (digits.length !== 8) {
      setStudentError('Vui lòng nhập đủ 8 chữ số ngày sinh DD/MM/YYYY.');
      return;
    }

    setStudentLoading(true);
    try {
      const res = await signInStudent(studentCode, digits);
      if (res.success) {
        router.push(res.redirect || '/student/dashboard');
        router.refresh();
      } else {
        setStudentError(res.error || 'Mã sinh viên hoặc ngày sinh không đúng.');
      }
    } catch {
      setStudentError('Lỗi kết nối máy chủ.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleLecturerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLecturerError(null);
    setLecturerLoading(true);
    try {
      const res = await signInLecturer(email, password);
      if (res.success) {
        router.push(res.redirect || '/lecturer/dashboard');
        router.refresh();
      } else {
        setLecturerError(res.error || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch {
      setLecturerError('Lỗi kết nối máy chủ.');
    } finally {
      setLecturerLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Spacer */}
      <div className="h-6"></div>

      {/* Hero Section */}
      <section className="text-center px-4 max-w-4xl mx-auto space-y-4 pt-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Squeeze The Quizzes like Squeeze the Lemon <br />
          <span className="text-emerald-400 block mt-2">-&gt; make it lemonade</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 font-medium">
          Học + Hỏi + Hiểu = <span className="text-rose-400 font-bold">10 điểm!.</span>
        </p>
      </section>

      {/* Main Interaction Area: 2-Tab Switching Area */}
      <section className="my-8 w-full max-w-md mx-auto px-4 z-10">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          {/* Tab Switch Buttons */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'student'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Tab 1: Cổng Sinh Viên</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lecturer')}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'lecturer'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Tab 2: Cổng Giảng Viên</span>
            </button>
          </div>

          {/* Tab 1 Content: Cổng Sinh Viên */}
          {activeTab === 'student' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="text-center pb-1">
                <h2 className="text-base font-bold text-white">Đăng Nhập Dành Cho Sinh Viên</h2>
                <p className="text-xs text-slate-400 mt-0.5">Sử dụng Mã sinh viên & Ngày sinh để làm bài</p>
              </div>

              {studentError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{studentError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Mã Sinh Viên (MSSV)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 20120001"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Ngày Sinh (Mật khẩu)</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="DD/MM/YYYY"
                    value={dob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    maxLength={10}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={studentLoading}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg"
              >
                {studentLoading ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Vào Phòng Thi Ngay</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Tab 2 Content: Cổng Giảng Viên */}
          {activeTab === 'lecturer' && (
            <form onSubmit={handleLecturerLogin} className="space-y-4">
              <div className="text-center pb-1">
                <h2 className="text-base font-bold text-white">Đăng Nhập Giảng Viên</h2>
                <p className="text-xs text-slate-400 mt-0.5">Quản lý lớp học phần, Test Bank và điểm thi</p>
              </div>

              {lecturerError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lecturerError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Email Giảng Viên</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="giangvien@edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Mật Khẩu</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lecturerLoading}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg"
              >
                {lecturerLoading ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Vào Trang Quản Trị</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-slate-500 space-y-1 z-10 border-t border-slate-900">
        <p className="font-semibold text-slate-400">Squeeze The Quizzes v1.0</p>
        <p>Giảng viên: <span className="font-medium text-slate-300">ThS. Lê Thị Thanh Phương</span></p>
      </footer>
    </main>
  );
}
