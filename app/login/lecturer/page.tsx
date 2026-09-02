'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, ArrowLeft, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { loginLecturer } from '@/app/actions/auth';
import { isRemote } from '@/lib/data';

export default function LecturerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginLecturer(email, password);
      if (res.success) {
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next && next.startsWith('/lecturer') ? next : res.redirect || '/lecturer/dashboard');
        router.refresh();
      } else {
        setError(res.error || 'Đăng nhập thất bại.');
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
      <div className="absolute top-1/4 left-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
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
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Đăng Nhập Giảng Viên</h1>
              <p className="text-xs text-slate-400">Cổng quản lý lớp & chấm điểm học phần</p>
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
                Email Giảng Viên
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="lecturer@university.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mật Khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required={isRemote}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Đang kết nối...</span>
              ) : (
                <>
                  <span>Vào Bảng Điều Khiển</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Gợi ý chỉ dành cho chế độ demo — ẩn hoàn toàn khi đã nối Supabase */}
          {!isRemote && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-amber-400/80">
                ⚠️ Chế độ demo (chưa cấu hình Supabase): mật khẩu không được kiểm tra. Thử{' '}
                <button type="button" onClick={() => setEmail('giangvien@edu.vn')} className="text-indigo-400 underline">giangvien@edu.vn</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
