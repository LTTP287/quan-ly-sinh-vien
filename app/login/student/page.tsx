'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, ArrowLeft, KeyRound, User, AlertCircle, Sparkles } from 'lucide-react';
import { loginStudent } from '@/app/actions/auth';

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginStudent(studentCode, password);
      if (res.success && res.user) {
        // Save session locally for client demo
        localStorage.setItem('user_session', JSON.stringify(res.user));
        router.push('/student/dashboard');
      } else {
        setError(res.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại Mã sinh viên.');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang chủ
        </Link>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Đăng Nhập Sinh Viên</h1>
              <p className="text-xs text-slate-400">Hệ thống thi trắc nghiệm học phần</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mã Sinh Viên (MSSV)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 20120001"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mật Khẩu Mặc Định
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Mật khẩu do Giảng viên cung cấp"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                * Nếu là lần đầu đăng nhập, dùng mật khẩu mặc định được cung cấp trong danh sách lớp.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Vào Phòng Thi & Lớp Học</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Hint */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              💡 Thử nghiệm nhanh: Nhập bất kỳ MSSV nào (VD: <button type="button" onClick={() => setStudentCode('20120001')} className="text-purple-400 underline">20120001</button>)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
