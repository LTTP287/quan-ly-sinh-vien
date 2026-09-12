'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Award, FileSpreadsheet, Download, Search,
  Users, CheckCircle2, AlertTriangle, ShieldAlert, Clock,
  Filter, Eye, RefreshCw
} from 'lucide-react';
import { ClassModule, Quiz, Submission } from '@/types/database';
import { listClasses, listQuizzes, listSubmissions } from '@/lib/data';

export default function LecturerGradesSummaryPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassModule[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const clsList = await listClasses();
      const qList = await listQuizzes();
      setClasses(clsList);
      setQuizzes(qList);

      // Fetch all submissions from server
      const res = await fetch('/api/lecturer/submissions');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.submissions)) {
          setAllSubmissions(json.submissions);
        }
      }
    } catch (err) {
      console.error('Không tải được bảng điểm tổng hợp', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lọc bài nộp theo lớp, theo bài thi và theo từ khóa tìm kiếm
  const filteredSubmissions = allSubmissions.filter((s) => {
    if (selectedQuizId !== 'all' && s.quiz_id !== selectedQuizId) return false;

    // Lọc theo lớp nếu có
    if (selectedClassId !== 'all') {
      const q = quizzes.find((x) => x.id === s.quiz_id);
      const isAssigned = q?.assigned_class_ids?.includes(selectedClassId) || q?.class_id === selectedClassId;
      if (!isAssigned) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const code = (s.student?.student_code || '').toLowerCase();
      const name = (s.student?.full_name || '').toLowerCase();
      if (!code.includes(term) && !name.includes(term)) return false;
    }

    return true;
  });

  // Tính các chỉ số thống kê
  const totalSubmissions = filteredSubmissions.length;
  const scoresList = filteredSubmissions
    .map((s) => Number(s.total_score))
    .filter((v) => !isNaN(v) && v !== null);

  const avgScore = scoresList.length > 0
    ? (scoresList.reduce((a, b) => a + b, 0) / scoresList.length).toFixed(1)
    : '—';

  const maxScore = scoresList.length > 0 ? Math.max(...scoresList).toFixed(1) : '—';
  const totalViolations = filteredSubmissions.reduce((acc, s) => acc + (s.tab_violations_count || 0), 0);

  const handleExportExcel = () => {
    const exportRows = filteredSubmissions.map((s, idx) => ({
      'STT': idx + 1,
      'Mã Sinh Viên': s.student?.student_code || '',
      'Họ và Tên': s.student?.full_name || '',
      'Bài Thi': s.quiz?.title || s.quiz_id,
      'Điểm Số (Thang 10)': s.total_score !== null ? s.total_score : 'Chưa chấm',
      'Số Lần Vi Phạm Tab': s.tab_violations_count || 0,
      'Thời Gian Nộp': s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : 'Chưa nộp',
      'Trạng Thái': s.status === 'submitted' ? 'Đã nộp bài' : (s.status === 'timed_out' ? 'Hết giờ' : 'Đang làm bài'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bang_Diem_Tong_Hop');
    XLSX.writeFile(workbook, `Bang_Diem_Tong_Hop_Sinh_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
              title="Về Bảng Điều Khiển"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <h1 className="font-bold text-lg text-white">Bảng Điểm Tổng Hợp Bài Thi Của Sinh Viên</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Xem toàn bộ kết quả làm bài, vi phạm chuyển tab và xuất file Excel
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredSubmissions.length === 0}
              className="gradient-button px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Lượt Nộp Bài</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{totalSubmissions}</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm Trung Bình</p>
              <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">{avgScore} / 10</h3>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm Cao Nhất</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{maxScore} / 10</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Lượt Vi Phạm Tab</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{totalViolations} lượt</h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            {/* Filter by Class */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Lớp:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tất cả lớp học phần ({classes.length})</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    [{cls.code}] {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Quiz */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Đề thi:</label>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tất cả bài Quiz ({quizzes.length})</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo MSSV hoặc họ tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Submissions Table */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Đang tải bảng điểm tổng hợp...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Chưa có bài thi nào được nộp</p>
              <p className="text-xs text-slate-500">
                Khi sinh viên hoàn thành bài kiểm tra, toàn bộ điểm số và bằng chứng sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-4 w-12 text-center">STT</th>
                    <th className="p-4">Mã Sinh Viên</th>
                    <th className="p-4">Họ và Tên</th>
                    <th className="p-4">Bài Thi</th>
                    <th className="p-4 text-center">Điểm Số</th>
                    <th className="p-4 text-center">Vi Phạm Tab</th>
                    <th className="p-4">Thời Gian Nộp</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredSubmissions.map((s, idx) => {
                    const isPassed = (s.total_score || 0) >= 5;
                    const hasViolation = (s.tab_violations_count || 0) > 0;
                    return (
                      <tr key={s.id || idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 text-center text-xs text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-4 font-mono font-bold text-indigo-400">
                          {s.student?.student_code || s.student_id}
                        </td>
                        <td className="p-4 text-white font-semibold">
                          {s.student?.full_name || 'Sinh Viên'}
                        </td>
                        <td className="p-4 text-xs text-slate-300">
                          <span className="font-semibold text-purple-300">{s.quiz?.title || s.quiz_id}</span>
                        </td>
                        <td className="p-4 text-center">
                          {s.total_score !== null && s.total_score !== undefined ? (
                            <span
                              className={`inline-block font-mono font-extrabold text-sm px-3 py-1 rounded-lg ${
                                isPassed
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {s.total_score} / 10
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {hasViolation ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              <span>{s.tab_violations_count} lần</span>
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400/80 font-mono">0</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                            {s.status === 'submitted' ? 'Đã nộp bài' : (s.status === 'timed_out' ? 'Hết giờ' : 'Đang làm')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
