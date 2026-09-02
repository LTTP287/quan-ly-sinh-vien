'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, ArrowLeft, Calendar, User, AlertCircle, Sparkles } from 'lucide-react';
import { loginStudent } from '@/app/actions/auth';

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState('');
  const [dob, setDob] = useState(''); // dạng hiển thị DD/MM/YYYY
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tự chèn dấu "/" khi gõ để sinh viên khỏi nhầm định dạng ngày sinh
  const handleDobChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDob(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digits = dob.replace(/\D/g, '');
    if (digits.length !== 8) {
      setError('Vui lòng nhập đủ ngày sinh theo định dạng DD/MM/YYYY.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginStudent(studentCode, digits);
      if (res.success) {
        const next = new URLSearchParams(window.location.search).get('next');
        const target = next && next.startsWith('/student') ? next : res.redirect || '/student/dashboard';
        router.push(target);
        router.refresh();
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
                Ngày Sinh (Mật khẩu)
              </label>
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
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono tracking-wider"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                * Mật khẩu mặc định là ngày sinh của bạn theo hồ sơ lớp, định dạng Ngày/Tháng/Năm.
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
                  <span>Vào Trang Sinh Viên</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              💡 Chỉ đăng nhập được ở <strong>1 thiết bị</strong> tại một thời điểm — đăng nhập ở
              nơi khác sẽ tự đăng xuất phiên cũ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
