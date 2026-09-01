'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, FileSpreadsheet, Download, Eye, EyeOff, 
  Award, TrendingUp, Users, ShieldAlert, CheckCircle2, Lock 
} from 'lucide-react';
import { Quiz, Submission } from '@/types/database';

export default function QuizAnalyticsPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz>({
    id: params.id,
    class_id: 'class-1',
    title: 'Bài Kiểm Tra Giữa Kỳ - React & Next.js App Router',
    description: 'Báo cáo điểm số bài thi giữa kỳ học phần INT3306',
    time_limit_minutes: 45,
    start_at: new Date().toISOString(),
    end_at: new Date().toISOString(),
    is_published: true,
    show_results: false, // Default locked
    shuffle_questions: true,
    created_at: new Date().toISOString(),
  });

  const [submissions] = useState<Submission[]>([
    {
      id: 'sub-1',
      quiz_id: params.id,
      student_id: 'st-1',
      started_at: new Date(Date.now() - 3000000).toISOString(),
      submitted_at: new Date(Date.now() - 600000).toISOString(),
      total_score: 9.0,
      status: 'submitted',
      tab_violations_count: 0,
      student: {
        id: 'st-1',
        email: '20120001@student.edu.vn',
        student_code: '20120001',
        full_name: 'Nguyễn Văn An',
        role: 'student',
        created_at: new Date().toISOString(),
      },
    },
    {
      id: 'sub-2',
      quiz_id: params.id,
      student_id: 'st-2',
      started_at: new Date(Date.now() - 3000000).toISOString(),
      submitted_at: new Date(Date.now() - 400000).toISOString(),
      total_score: 8.0,
      status: 'submitted',
      tab_violations_count: 1,
      student: {
        id: 'st-2',
        email: '20120002@student.edu.vn',
        student_code: '20120002',
        full_name: 'Lê Thị Bình',
        role: 'student',
        created_at: new Date().toISOString(),
      },
    },
    {
      id: 'sub-3',
      quiz_id: params.id,
      student_id: 'st-3',
      started_at: new Date(Date.now() - 3000000).toISOString(),
      submitted_at: new Date(Date.now() - 100000).toISOString(),
      total_score: 6.5,
      status: 'submitted',
      tab_violations_count: 2,
      student: {
        id: 'st-3',
        email: '20120003@student.edu.vn',
        student_code: '20120003',
        full_name: 'Phạm Hoàng Cường',
        role: 'student',
        created_at: new Date().toISOString(),
      },
    },
  ]);

  const handleToggleShowResults = () => {
    setQuiz((prev) => ({
      ...prev,
      show_results: !prev.show_results,
    }));
  };

  const handleExportExcel = () => {
    const exportData = submissions.map((s, idx) => ({
      'STT': idx + 1,
      'Mã Sinh Viên': s.student?.student_code || '',
      'Họ và Tên': s.student?.full_name || '',
      'Email': s.student?.email || '',
      'Điểm Số': s.total_score || 0,
      'Số Lần Vi Phạm Chuyển Tab': s.tab_violations_count,
      'Thời Gian Nộp': s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : 'Chưa nộp',
      'Trạng Thái': s.status === 'submitted' ? 'Đã nộp bài' : 'Đang làm bài',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Điểm Quiz');
    XLSX.writeFile(workbook, `Bang_Diem_${quiz.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const avgScore = (
    submissions.reduce((acc, s) => acc + (s.total_score || 0), 0) / submissions.length
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
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
              <h1 className="font-bold text-lg text-white">Thống Kê Điểm Số Bài Quiz</h1>
              <p className="text-xs text-slate-400 mt-0.5">{quiz.title}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Toggle Show Results button */}
            <button
              onClick={handleToggleShowResults}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all ${
                quiz.show_results
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {quiz.show_results ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{quiz.show_results ? 'Đã Công Bố Điểm Cho Sinh Viên' : 'Mở Đã Khóa Điểm (Bấm Để Công Bố)'}</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="gradient-button px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Bảng Điểm Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Analytics Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm Trung Bình</p>
              <h2 className="text-3xl font-extrabold text-indigo-400 mt-1">{avgScore} / 10</h2>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Đã Nộp Bài</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{submissions.length} SV</h2>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ Lệ Đạt (&ge; 5.0)</p>
              <h2 className="text-3xl font-extrabold text-emerald-400 mt-1">100%</h2>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vi Phạm Chuyển Tab</p>
              <h2 className="text-3xl font-extrabold text-amber-400 mt-1">
                {submissions.reduce((acc, s) => acc + s.tab_violations_count, 0)} lần
              </h2>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Submissions Roster Table */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Danh Sách Nộp Bài & Chi Tiết Vi Phạm</h2>
              <p className="text-xs text-slate-400">Theo dõi điểm thi và số lần rời màn hình của từng sinh viên</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">STT</th>
                  <th className="p-4">Mã Sinh Viên</th>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Điểm Số</th>
                  <th className="p-4">Vi Phạm Chuyển Tab</th>
                  <th className="p-4">Thời Gian Nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {submissions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="p-4 font-mono font-semibold text-indigo-400">{s.student?.student_code}</td>
                    <td className="p-4 font-medium text-white">{s.student?.full_name}</td>
                    <td className="p-4 text-slate-400 text-xs">{s.student?.email}</td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-400 text-base">{s.total_score} / 10</span>
                    </td>
                    <td className="p-4">
                      {s.tab_violations_count > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{s.tab_violations_count} lần</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">0 lần</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString('vi-VN') : 'Đang làm'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
