'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, FilePlus2, BookOpen, Plus, Sparkles, 
  Clock, Eye, EyeOff, CheckSquare, Square, FileCheck2, ArrowRight, 
  Calendar, KeyRound, Power, ShieldCheck, Lock, AlertCircle, Trash2, Award, Edit3,
  Calculator, Sliders, CheckCircle2, Layers
} from 'lucide-react';
import { Quiz, ClassModule, ClassQuizSchedule } from '@/types/database';
import { listQuizzes, listClasses, saveQuizSchedules, deleteQuiz, isRemote } from '@/lib/data';

export default function LecturerTestBankPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassModule[]>([]);
  const [activeQuizForSchedule, setActiveQuizForSchedule] = useState<Quiz | null>(null);

  // Helper tính toán điểm số và 3 phần đề thi
  const getQuizPointsBreakdown = (quiz: Quiz) => {
    const questions = quiz.questions || [];
    if (questions.length === 0) {
      return {
        totalPts: 10,
        mcCount: 20,
        mcPts: 4.0,
        shortCount: 3,
        shortPts: 3.0,
        longCount: 1,
        longPts: 3.0,
      };
    }
    const mc = questions.filter((q) => q.question_type === 'multiple_choice' || q.question_type === 'true_false');
    const mcPts = Math.round(mc.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 10) / 10;

    const short = questions.filter((q) => q.question_type === 'short_answer');
    const shortPts = Math.round(short.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 10) / 10;

    const long = questions.filter((q) => q.question_type === 'long_answer');
    const longPts = Math.round(long.reduce((sum, q) => sum + (Number(q.points) || 0), 0) * 10) / 10;

    const totalPts = Math.round((mcPts + shortPts + longPts) * 10) / 10;

    return {
      totalPts: totalPts > 0 ? totalPts : 10,
      mcCount: mc.length,
      mcPts,
      shortCount: short.length,
      shortPts,
      longCount: long.length,
      longPts,
    };
  };

  const handleCreateMidtermTemplate = async () => {
    try {
      const { createDefaultMidtermQuiz, saveStoredQuiz } = await import('@/lib/classStore');
      const midterm = createDefaultMidtermQuiz();
      saveStoredQuiz(midterm);
      const updated = await listQuizzes();
      setQuizzes(updated);
      alert('Đã khởi tạo thành công Đề Thi Midterm Chuẩn (10 Điểm: 20 trắc nghiệm 4.0đ + 3 câu ngắn 3.0đ + 1 tự luận 3.0đ) vào Ngân Hàng Đề!');
    } catch (e: any) {
      alert(`Lỗi khởi tạo đề thi mẫu: ${e?.message || e}`);
    }
  };

  const handleApplyMidtermToQuiz = async (quizId: string) => {
    try {
      const { getQuizWithQuestions, updateQuiz } = await import('@/lib/data');
      const target = await getQuizWithQuestions(quizId);
      if (!target || !target.questions || target.questions.length === 0) {
        alert('Đề thi này chưa có câu hỏi trong ngân hàng đề. Vui lòng bấm Chỉnh Sửa để thêm câu hỏi.');
        return;
      }
      const updatedQuestions = target.questions.map((q) => {
        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
          return { ...q, points: 0.2 };
        }
        if (q.question_type === 'short_answer') {
          return { ...q, points: 1.0 };
        }
        if (q.question_type === 'long_answer') {
          return { ...q, points: 3.0 };
        }
        return q;
      });

      await updateQuiz(
        quizId,
        { ...target },
        updatedQuestions,
        (target.assigned_class_ids || []).map((cid) => ({
          class_id: cid,
          start_at: target.start_at || new Date().toISOString(),
          end_at: target.end_at || new Date(Date.now() + 86400000 * 7).toISOString(),
          access_code: target.passcode || null,
        }))
      );

      const refreshed = await listQuizzes();
      setQuizzes(refreshed);
      alert('Đã áp dụng thang điểm Midterm (0.2đ / 1.0đ / 3.0đ) thành công cho bài thi!');
    } catch (err: any) {
      alert(`Lỗi cập nhật thang điểm: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setQuizzes(await listQuizzes());
        setClasses(await listClasses());
      } catch (err) {
        console.error('Không tải được Test Bank', err);
      }
    })();
  }, []);

  const handleToggleAssignClass = async (quizId: string, classId: string) => {
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
        access_code: '',
        is_active: true,
      };
    }

    try {
      setQuizzes(await saveQuizSchedules(quizId, schedules));
    } catch (err: any) {
      alert(`Không lưu được phân công lớp: ${err?.message || err}`);
    }
  };

  const handleUpdateSchedule = async (quizId: string, classId: string, updates: Partial<ClassQuizSchedule>) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId);
    if (!targetQuiz) return;

    const schedules = { ...(targetQuiz.class_schedules || {}) };
    schedules[classId] = {
      ...(schedules[classId] || {
        class_id: classId,
        start_at: new Date().toISOString().slice(0, 16),
        end_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        access_code: '',
        is_active: true,
      }),
      ...updates,
    };

    try {
      setQuizzes(await saveQuizSchedules(quizId, schedules));
    } catch (err: any) {
      alert(`Không lưu được lịch thi: ${err?.message || err}`);
    }
  };

  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá đề thi "${title}" khỏi Ngân hàng đề không? Thao tác này không thể hoàn tác.`)) return;
    try {
      setQuizzes(await deleteQuiz(quizId));
    } catch (err: any) {
      alert(`Không xoá được đề thi: ${err?.message || err}`);
    }
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

          <div className="flex items-center space-x-3">
            <Link
              href="/lecturer/grades"
              className="px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm font-semibold flex items-center space-x-2 transition-colors shadow-sm"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Bảng Điểm Tổng Hợp</span>
            </Link>

            <Link
              href="/lecturer/quizzes/new"
              className="gradient-button px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Đề Thi Mới Vào Test Bank</span>
            </Link>
          </div>
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

        {/* BANNER: HỆ THỐNG THANG ĐIỂM & PHÂN BỔ ĐIỂM THI TEST BANK */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-lg font-bold text-white">Hệ Thống Thang Điểm & Phân Bổ Điểm Thi (Thang Điểm 10.0)</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ Chuẩn hóa 3 phần
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Đã thiết lập sẵn khung thang điểm 10.0 điểm phân bổ chuẩn 3 phần theo đúng yêu cầu khảo thí của Thầy/Cô:
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleCreateMidtermTemplate}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-2 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>⚡ Khởi Tạo Đề Thi Midterm Chuẩn (10đ)</span>
              </button>

              <Link
                href="/lecturer/quizzes/new"
                className="gradient-button px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Đề Thi Mới Tùy Chỉnh</span>
              </Link>
            </div>
          </div>

          {/* 3-Section Cards Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/20 space-y-1">
              <span className="text-[11px] font-bold uppercase text-indigo-400">Phần 1: Trắc Nghiệm (4.0 Điểm)</span>
              <p className="text-xs text-white font-semibold">20 câu &times; 0.2 điểm/câu = 4.0đ</p>
              <p className="text-[11px] text-slate-400">Đánh giá kiến thức nền tảng & khái niệm cốt lõi</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-bold uppercase text-emerald-400">Phần 2: Câu Hỏi Ngắn (3.0 Điểm)</span>
              <p className="text-xs text-white font-semibold">3 câu &times; 1.0 điểm/câu = 3.0đ</p>
              <p className="text-[11px] text-slate-400">Bài tập tính toán & phân tích tình huống ngắn</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/20 space-y-1">
              <span className="text-[11px] font-bold uppercase text-amber-400">Phần 3: Tự Luận Dài (3.0 Điểm)</span>
              <p className="text-xs text-white font-semibold">1 câu tự luận tổng hợp = 3.0đ</p>
              <p className="text-[11px] text-slate-400">Case study & giải pháp chiến lược chuỗi cung ứng</p>
            </div>
          </div>
        </div>

        {/* Quizzes Test Bank Cards */}
        {quizzes.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-4">
            <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
              <Calculator className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Chưa có đề thi nào trong Ngân hàng đề Test Bank</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Thầy/Cô có thể tạo nhanh đề thi Midterm mẫu chuẩn 3 phần (10.0 điểm: 20 câu trắc nghiệm 4.0đ + 3 câu ngắn 3.0đ + 1 câu dài 3.0đ) chỉ với 1 cú nhấp.
            </p>
            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                onClick={handleCreateMidtermTemplate}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ Khởi Tạo Ngân Hàng Đề Thi Midterm Chuẩn (10 Điểm)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {quizzes.map((quiz) => {
              const pts = getQuizPointsBreakdown(quiz);
              return (
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

                    {/* THANG ĐIỂM & PHÂN BỔ 3 PHẦN TRÊN TỪNG ĐỀ THI */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-2.5 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calculator className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Thang Điểm Bài Thi</span>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          Math.abs(pts.totalPts - 10) < 0.05
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {pts.totalPts} / 10.0 điểm
                        </span>
                      </div>

                      {/* 3 Phần phân bổ */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                          <span className="block text-[10px] font-bold text-indigo-400">P1. Trắc Nghiệm</span>
                          <span className="font-bold text-white text-xs">{pts.mcPts}đ</span>
                          <span className="block text-[10px] text-slate-400">{pts.mcCount} câu</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                          <span className="block text-[10px] font-bold text-emerald-400">P2. Câu Ngắn</span>
                          <span className="font-bold text-white text-xs">{pts.shortPts}đ</span>
                          <span className="block text-[10px] text-slate-400">{pts.shortCount} câu</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                          <span className="block text-[10px] font-bold text-amber-400">P3. Tự Luận</span>
                          <span className="font-bold text-white text-xs">{pts.longPts}đ</span>
                          <span className="block text-[10px] text-slate-400">{pts.longCount} câu</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span>🎲 Rút ngẫu nhiên/SV: <strong className="text-purple-400">{quiz.questions_per_student || 24} câu</strong></span>
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
                      access_code: '',
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

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link
                      href={`/lecturer/quizzes/${quiz.id}/edit`}
                      className="inline-flex items-center text-xs font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 px-3 py-1.5 rounded-xl space-x-1.5 transition-colors shadow-sm"
                      title="Mở giao diện điều chỉnh thang điểm và ngân hàng câu hỏi"
                    >
                      <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Chỉnh Sửa Thang Điểm & Đề Thi</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleApplyMidtermToQuiz(quiz.id)}
                      className="inline-flex items-center text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl space-x-1.5 transition-colors shadow-sm"
                      title="Áp dụng thang điểm Midterm: 0.2đ Trắc nghiệm + 1.0đ Câu ngắn + 3.0đ Tự luận"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mẫu Midterm (4đ - 3đ - 3đ)</span>
                    </button>

                    <Link
                      href={`/lecturer/quizzes/${quiz.id}/analytics`}
                      className="inline-flex items-center text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-xl space-x-1 transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Xem Bảng Điểm</span>
                    </Link>
                  </div>

                    <button
                      onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                      className="inline-flex items-center text-xs font-semibold text-rose-400 hover:text-rose-300 space-x-1 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Xoá đề thi khỏi ngân hàng"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xoá đề</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}
