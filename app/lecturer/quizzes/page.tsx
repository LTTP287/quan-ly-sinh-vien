'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, FilePlus2, BookOpen, Plus, Sparkles, 
  Clock, Eye, EyeOff, CheckSquare, Square, FileCheck2, ArrowRight, 
  Calendar, KeyRound, Power, ShieldCheck, Lock, AlertCircle 
} from 'lucide-react';
import { Quiz, ClassModule, ClassQuizSchedule } from '@/types/database';
import { getStoredQuizzes, getStoredClasses, saveStoredQuiz } from '@/lib/classStore';

export default function LecturerTestBankPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassModule[]>([]);
  const [activeQuizForSchedule, setActiveQuizForSchedule] = useState<Quiz | null>(null);

  useEffect(() => {
    setQuizzes(getStoredQuizzes());
    setClasses(getStoredClasses());
  }, []);

  const handleToggleAssignClass = (quizId: string, classId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId);
    if (!targetQuiz) return;

    let assigned = targetQuiz.assigned_class_ids || [];
    const schedules = { ...(targetQuiz.class_schedules || {}) };

    if (assigned.includes(classId)) {
      assigned = assigned.filter((id) => id !== classId);
      delete schedules[classId];
    } else {
      assigned = [...assigned, classId];
      schedules[classId] = {
        class_id: classId,
        start_at: new Date().toISOString().slice(0, 16),
        end_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        access_code: 'LOG888',
        is_active: true,
      };
    }

    const updatedQuiz: Quiz = {
      ...targetQuiz,
      assigned_class_ids: assigned,
      assigned_classes_count: assigned.length,
      class_schedules: schedules,
    };

    const updatedList = saveStoredQuiz(updatedQuiz);
    setQuizzes(updatedList);
  };

  const handleUpdateSchedule = (quizId: string, classId: string, updates: Partial<ClassQuizSchedule>) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId);
    if (!targetQuiz) return;

    const schedules = { ...(targetQuiz.class_schedules || {}) };
    schedules[classId] = {
      ...(schedules[classId] || {
        class_id: classId,
        start_at: new Date().toISOString().slice(0, 16),
        end_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        access_code: 'LOG888',
        is_active: true,
      }),
      ...updates,
    };

    const updatedQuiz: Quiz = {
      ...targetQuiz,
      class_schedules: schedules,
    };

    const updatedList = saveStoredQuiz(updatedQuiz);
    setQuizzes(updatedList);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/lecturer/dashboard"
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-white">Thư Viện Ngân Hàng Đề Thi & Cấu Hình Giờ Thi Theo Lớp</h1>
              <p className="text-xs text-slate-400 mt-0.5">Đặt khung giờ thi & Mã PIN chống mở ở nhà cho từng nhóm lớp học phần</p>
            </div>
          </div>

          <Link
            href="/lecturer/quizzes/new"
            className="gradient-button px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đề Thi Mới Vào Test Bank</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Danh Sách Đề Thi & Cài Đặt Khung Giờ Thi Lớp</h2>
            <p className="text-sm text-slate-400 mt-1">Gán lớp, cài đặt giờ mở/đóng và Mã PIN phòng thi riêng cho mỗi ca thi</p>
          </div>
        </div>

        {/* Quizzes Test Bank Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Test Bank Dùng Chung
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{quiz.time_limit_minutes} phút</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{quiz.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{quiz.description}</p>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>🎲 Rút ngẫu nhiên/SV: <strong className="text-purple-400">{quiz.questions_per_student || 5} câu</strong></span>
                    <span>🔒 Trộn đề & Khóa câu trước</span>
                  </div>
                </div>
              </div>

              {/* PER-CLASS SCHEDULE & SECURITY ACCESS MANAGEMENT */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Lớp Được Gán & Khung Giờ Mở Thi Riêng</span>
                  </h4>
                  <span className="text-xs text-slate-400">
                    {quiz.assigned_class_ids?.length || 0} / {classes.length} lớp
                  </span>
                </div>

                <div className="space-y-3">
                  {classes.map((cls) => {
                    const isAssigned = quiz.assigned_class_ids?.includes(cls.id);
                    const schedule = quiz.class_schedules?.[cls.id] || {
                      class_id: cls.id,
                      start_at: new Date().toISOString().slice(0, 16),
                      end_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                      access_code: 'LOG888',
                      is_active: true,
                    };

                    return (
                      <div
                        key={cls.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isAssigned
                            ? 'border-indigo-500/50 bg-slate-900/90'
                            : 'border-slate-800 bg-slate-950/40 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            onClick={() => handleToggleAssignClass(quiz.id, cls.id)}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            {isAssigned ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="font-bold text-xs text-white">{cls.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                              {cls.code}
                            </span>
                          </div>

                          {isAssigned && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSchedule(quiz.id, cls.id, { is_active: !schedule.is_active })
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors ${
                                schedule.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{schedule.is_active ? 'ĐANG MỞ THI' : 'TẠM ĐÓNG PHÒNG THI'}</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Per-Class Schedule Settings */}
                        {isAssigned && (
                          <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Mở lúc (Start):</label>
                              <input
                                type="datetime-local"
                                value={schedule.start_at}
                                onChange={(e) =>
                                  handleUpdateSchedule(quiz.id, cls.id, { start_at: e.target.value })
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Đóng lúc (End):</label>
                              <input
                                type="datetime-local"
                                value={schedule.end_at}
                                onChange={(e) =>
                                  handleUpdateSchedule(quiz.id, cls.id, { end_at: e.target.value })
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1 flex items-center space-x-1">
                                <KeyRound className="w-3 h-3 text-amber-400" />
                                <span>Mã PIN Vào Phòng Thi:</span>
                              </label>
                              <input
                                type="text"
                                placeholder="VD: LOG888"
                                value={schedule.access_code || ''}
                                onChange={(e) =>
                                  handleUpdateSchedule(quiz.id, cls.id, { access_code: e.target.value })
                                }
                                className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-amber-400 focus:outline-none uppercase"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Link
                    href={`/lecturer/quizzes/${quiz.id}/analytics`}
                    className="inline-flex items-center text-xs font-semibold text-purple-400 hover:text-purple-300 space-x-1"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Xem thống kê điểm & xuất Excel</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
