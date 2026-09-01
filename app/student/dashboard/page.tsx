'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UserCheck, BookOpen, Clock, AlertTriangle, ArrowRight, 
  LogOut, Sparkles, CheckCircle2, Lock, KeyRound, ShieldAlert, X 
} from 'lucide-react';
import { Quiz, UserProfile, ClassModule, ClassQuizSchedule } from '@/types/database';
import { getStoredClasses, getStoredQuizzes } from '@/lib/classStore';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassModule[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // PIN Passcode Modal State
  const [selectedQuizForPin, setSelectedQuizForPin] = useState<Quiz | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    // Read session
    const sessionStr = localStorage.getItem('user_session');
    if (sessionStr) {
      try {
        const u = JSON.parse(sessionStr);
        if (u.role === 'student') {
          setUser(u);
        }
      } catch (e) {}
    }

    // Read stored classes and quizzes
    const loadedClasses = getStoredClasses();
    setEnrolledClasses(loadedClasses);

    const loadedQuizzes = getStoredQuizzes();
    setQuizzes(loadedQuizzes);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    router.push('/');
  };

  // Validate PIN and Enter Exam
  const handleVerifyPinAndEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizForPin) return;

    // Get expected PIN (default LOG888 if not specified)
    const classId = enrolledClasses[0]?.id || 'class-1';
    const schedule = selectedQuizForPin.class_schedules?.[classId];
    const expectedPin = (schedule?.access_code || 'LOG888').trim().toUpperCase();
    const userPin = pinInput.trim().toUpperCase();

    if (userPin !== expectedPin) {
      setPinError(`Mã PIN không đúng! Vui lòng nhìn trên bảng lớp hoặc hỏi Giảng viên.`);
      return;
    }

    // PIN is correct -> Redirect to exam room!
    router.push(`/student/exam/${selectedQuizForPin.id}`);
  };

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
                MSSV: <strong className="text-purple-400 font-mono">{user?.student_code || '20120001'}</strong> - {user?.full_name || 'Nguyễn Văn An'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-10">
        {/* Banner Announcement */}
        <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 mt-0.5">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tự Động Ghi Danh Học Phần 2026 - 2027</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Hệ thống tự động nhận diện danh sách lớp từ Giảng viên. Phòng thi mở theo khung giờ lớp & yêu cầu nhập <strong>Mã PIN phòng thi</strong> do Giảng viên cung cấp tại lớp.
              </p>
            </div>
          </div>
        </div>

        {/* Enrolled Classes Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Lớp Học Phần Đã Ghi Danh ({enrolledClasses.length} lớp)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledClasses.map((cls) => (
              <div key={cls.id} className="glass-card p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {cls.code}
                </span>
                <h3 className="text-sm font-bold text-white mt-2">{cls.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{cls.semester}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quizzes Roster */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Bài Kiểm Tra Học Phần</h2>
              <p className="text-sm text-slate-400 mt-1">Danh sách bài thi trắc nghiệm trong Test Bank được giao cho lớp của bạn</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((q) => {
              const studentClassId = enrolledClasses[0]?.id || 'class-1';
              const schedule = q.class_schedules?.[studentClassId] || {
                class_id: studentClassId,
                start_at: new Date(Date.now() - 3600000).toISOString(),
                end_at: new Date(Date.now() + 86400000 * 7).toISOString(),
                access_code: 'LOG888',
                is_active: true,
              };

              const now = new Date();
              const startTime = new Date(schedule.start_at);
              const endTime = new Date(schedule.end_at);

              const isBeforeStart = now < startTime;
              const isAfterEnd = now > endTime;
              const isRoomOpen = schedule.is_active && !isBeforeStart && !isAfterEnd;

              return (
                <div
                  key={q.id}
                  className={`glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    isRoomOpen
                      ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {enrolledClasses[0]?.name || 'Introduction to Logistics & SCM'}
                      </span>
                      {isRoomOpen ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          ● Đang mở thi tại lớp
                        </span>
                      ) : isBeforeStart ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          🔒 Chưa đến giờ mở
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                          Đã kết thúc
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{q.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{q.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>Thời gian: <strong>{q.time_limit_minutes} phút</strong></span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Yêu cầu Mã PIN tại lớp</span>
                      </span>
                    </div>

                    {/* Schedule Time Badge */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-4">
                      <div>Khung giờ lớp bạn: <strong className="text-white">{startTime.toLocaleString('vi-VN')} &rarr; {endTime.toLocaleString('vi-VN')}</strong></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    {isRoomOpen ? (
                      <button
                        onClick={() => {
                          setSelectedQuizForPin(q);
                          setPinInput('');
                          setPinError(null);
                        }}
                        className="w-full gradient-button py-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-2"
                      >
                        <KeyRound className="w-4 h-4 text-amber-300" />
                        <span>Nhập Mã PIN Để Vào Thi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : isBeforeStart ? (
                      <div className="w-full text-center py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium flex items-center justify-center space-x-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Chưa đến giờ mở thi theo lịch của lớp</span>
                      </div>
                    ) : (
                      <div className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 font-medium">
                        Phòng thi đã đóng (Đã hết hạn làm bài)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* EXAM ROOM PIN PASSCODE VERIFICATION MODAL */}
      {selectedQuizForPin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border border-purple-500/40 w-full max-w-md space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Xác Thực Mã PIN Phòng Thi</h3>
                  <p className="text-xs text-slate-400">Nhập mã PIN do Giảng viên cung cấp tại lớp</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedQuizForPin(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pinError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPinAndEnter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Mã PIN Phòng Thi (Ví dụ: LOG888)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập mã PIN..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-4 py-3 font-mono font-extrabold text-lg text-amber-400 tracking-wider text-center focus:outline-none focus:border-purple-400 uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  💡 Thử nghiệm nhanh: Mã PIN lớp hiện tại là <strong className="text-amber-400 font-mono">LOG888</strong>
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuizForPin(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="gradient-button px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xác Nhận Vào Phòng Thi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
