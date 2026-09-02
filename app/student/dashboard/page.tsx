'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck, BookOpen, Clock, AlertTriangle, ArrowRight,
  LogOut, Sparkles, CheckCircle2, Lock, KeyRound, History, X,
} from 'lucide-react';
import { signOut } from '@/lib/data';

interface DashboardUser {
  id: string;
  full_name: string;
  student_code: string | null;
}

interface DashboardQuiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  start_at: string;
  end_at: string;
  requires_passcode: boolean;
  class_name: string;
  submitted: boolean;
  score: number | null;
  show_results: boolean;
}

interface DashboardData {
  user: DashboardUser;
  classes: { id: string; code: string; name: string; semester: string }[];
  quizzes: { open: DashboardQuiz[]; upcoming: DashboardQuiz[]; closed: DashboardQuiz[] };
  history: {
    quiz_id: string;
    title: string;
    score: number | null;
    submitted_at: string | null;
    violations: number;
    released: boolean;
  }[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Popup nhập Mã phòng thi
  const [activeQuiz, setActiveQuiz] = useState<DashboardQuiz | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/student/dashboard', { cache: 'no-store' });
      if (res.status === 401) {
        // Phiên đã bị thay thế ở thiết bị khác (Single Session Lock) hoặc hết hạn
        router.push('/login/student?reason=session_expired');
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Không tải được dữ liệu.');
      setData(await res.json());
    } catch (err: any) {
      setLoadError(err?.message || 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Bấm "Bắt đầu thi" -> Popup mã phòng thi -> server xác thực -> vào phòng thi.
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setPasscodeError(null);
    setVerifying(true);

    try {
      const res = await fetch('/api/quizzes/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: activeQuiz.id, passcode }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push('/login/student?reason=session_expired');
        return;
      }
      if (!res.ok) {
        setPasscodeError(json.error || 'Không vào được phòng thi.');
        return;
      }
      router.push(json.redirect || `/student/exam/${activeQuiz.id}`);
    } catch {
      setPasscodeError('Không kết nối được máy chủ.');
    } finally {
      setVerifying(false);
    }
  };

  const user = data?.user;
  const classes = data?.classes || [];
  const openQuizzes = data?.quizzes.open || [];
  const upcomingQuizzes = data?.quizzes.upcoming || [];
  const closedQuizzes = data?.quizzes.closed || [];
  const history = data?.history || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-md">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Cổng Sinh Viên</h1>
              <p className="text-xs text-slate-400 mt-1">
                MSSV: <strong className="text-purple-400 font-mono">{user?.student_code || '...'}</strong>
                {user?.full_name ? ` - ${user.full_name}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-10">
        {loading && (
          <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-sm text-slate-400">
            Đang tải dữ liệu...
          </div>
        )}

        {loadError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Enrolled Classes Summary */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Lớp Học Phần Đã Ghi Danh ({classes.length} lớp)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <div key={cls.id} className="glass-card p-4 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {cls.code}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-2">{cls.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{cls.semester}</p>
                  </div>
                ))}
                {classes.length === 0 && (
                  <p className="text-sm text-slate-500">Bạn chưa được ghi danh vào lớp học phần nào.</p>
                )}
              </div>
            </div>

            {/* Đang mở */}
            <QuizSection
              title="Đang Mở Thi"
              icon={<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              quizzes={openQuizzes}
              emptyText="Hiện không có bài thi nào đang mở."
              renderAction={(q) =>
                q.submitted ? (
                  <div className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-medium">
                    Đã nộp bài — chờ Giảng viên công bố điểm
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveQuiz(q);
                      setPasscode('');
                      setPasscodeError(null);
                    }}
                    className="w-full gradient-button py-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-2"
                  >
                    <KeyRound className="w-4 h-4 text-amber-300" />
                    <span>Bắt Đầu Thi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              }
            />

            {/* Sắp mở */}
            <QuizSection
              title="Sắp Mở"
              icon={<Lock className="w-4 h-4 text-amber-400" />}
              quizzes={upcomingQuizzes}
              emptyText="Không có bài thi nào sắp mở."
              renderAction={(q) => (
                <div className="w-full text-center py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
                  Mở lúc {new Date(q.start_at).toLocaleString('vi-VN')}
                </div>
              )}
            />

            {/* Đã đóng */}
            <QuizSection
              title="Đã Đóng"
              icon={<Lock className="w-4 h-4 text-slate-500" />}
              quizzes={closedQuizzes}
              emptyText="Chưa có bài thi nào kết thúc."
              renderAction={(q) => (
                <div className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 font-medium">
                  {q.submitted
                    ? q.show_results && q.score !== null
                      ? `Điểm: ${q.score}/10`
                      : 'Đã nộp — chờ công bố điểm'
                    : 'Đã đóng (chưa nộp bài)'}
                </div>
              )}
            />

            {/* Lịch sử điểm */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>Lịch Sử Điểm Số</span>
              </h2>
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
                {history.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500 text-center">Bạn chưa nộp bài thi nào.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Bài Thi</th>
                          <th className="p-4">Điểm</th>
                          <th className="p-4">Vi Phạm</th>
                          <th className="p-4">Thời Gian Nộp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {history.map((h) => (
                          <tr key={h.quiz_id}>
                            <td className="p-4 font-medium text-white">{h.title}</td>
                            <td className="p-4">
                              {h.released && h.score !== null ? (
                                <span className="font-bold text-emerald-400">{h.score}/10</span>
                              ) : (
                                <span className="text-xs text-amber-400 flex items-center space-x-1">
                                  <Lock className="w-3 h-3" /> <span>Chưa công bố</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs">{h.violations} lần</td>
                            <td className="p-4 text-xs text-slate-400">
                              {h.submitted_at ? new Date(h.submitted_at).toLocaleString('vi-VN') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* POPUP MÃ PHÒNG THI */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border border-purple-500/40 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nhập Mã Phòng Thi</h3>
                  <p className="text-xs text-slate-400">{activeQuiz.title}</p>
                </div>
              </div>
              <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passcodeError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Mã Phòng Thi
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập mã phòng thi..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-4 py-3 font-mono font-extrabold text-lg text-amber-400 tracking-wider text-center focus:outline-none focus:border-purple-400 uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Mã do Giảng viên đọc trực tiếp tại lớp, chỉ có hiệu lực trong khung giờ thi.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="gradient-button px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{verifying ? 'Đang kiểm tra...' : 'Xác Nhận & Vào Thi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizSection({
  title,
  icon,
  quizzes,
  emptyText,
  renderAction,
}: {
  title: string;
  icon: React.ReactNode;
  quizzes: DashboardQuiz[];
  emptyText: string;
  renderAction: (q: DashboardQuiz) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center space-x-2">
        {icon}
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-500">({quizzes.length})</span>
      </h2>

      {quizzes.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((q) => (
            <div key={q.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    {q.class_name}
                  </span>
                  {q.submitted && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã nộp</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{q.title}</h3>
                {q.description && <p className="text-xs text-slate-400 mb-4 line-clamp-2">{q.description}</p>}

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Thời gian: <strong>{q.time_limit_minutes} phút</strong></span>
                  </span>
                  {q.requires_passcode && (
                    <span className="flex items-center space-x-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yêu cầu mã phòng thi</span>
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-4">
                  <div>
                    Khung giờ: <strong className="text-white">{new Date(q.start_at).toLocaleString('vi-VN')} &rarr; {new Date(q.end_at).toLocaleString('vi-VN')}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80">{renderAction(q)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
