'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Download, FileSpreadsheet, Award, TrendingUp,
  Users, CheckCircle2, AlertCircle, Sparkles, Settings2, Sliders,
  Save, Eye
} from 'lucide-react';
import { ClassModule, UserProfile, Quiz, Submission } from '@/types/database';
import { getClass, listStudents, listQuizzes, listSubmissions } from '@/lib/data';

interface StudentGradeRow {
  student: UserProfile;
  quizScores: Record<string, number | null>; // quizId -> score
  submittedCount: number;
  averageQuizScore: number;
  letterGrade: string;
  rank: string;
}

export default function ClassGradesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassModule | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissionsByQuiz, setSubmissionsByQuiz] = useState<Record<string, Record<string, number>>>({}); // quizId -> studentId -> score
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cls = await getClass(params.id);
        if (cls) setClassInfo(cls);

        const stList = await listStudents(params.id);
        setStudents(stList);

        // Lấy tất cả quizzes gán cho lớp này
        const allQuizzes = await listQuizzes();
        const classQuizzes = allQuizzes.filter(
          (q) => !q.assigned_class_ids || q.assigned_class_ids.includes(params.id) || q.class_id === params.id
        );
        setQuizzes(classQuizzes);

        // Lấy bài nộp cho từng quiz
        const subsMap: Record<string, Record<string, number>> = {};
        await Promise.all(
          classQuizzes.map(async (q) => {
            const subs = await listSubmissions(q.id);
            subsMap[q.id] = {};
            subs.forEach((s) => {
              if (s.student_id && s.total_score !== null && s.total_score !== undefined) {
                subsMap[q.id][s.student_id] = s.total_score;
              }
            });
          })
        );
        setSubmissionsByQuiz(subsMap);
      } catch (err) {
        console.error('Không tải được bảng điểm', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  // Tính điểm chữ và xếp loại theo thang điểm chuẩn Đại học
  const getLetterAndRank = (score: number): { letter: string; rank: string } => {
    if (score >= 8.5) return { letter: 'A', rank: 'Giỏi / Xuất sắc' };
    if (score >= 7.0) return { letter: 'B', rank: 'Khá' };
    if (score >= 5.5) return { letter: 'C', rank: 'Trung bình' };
    if (score >= 4.0) return { letter: 'D', rank: 'Trung bình yếu' };
    return { letter: 'F', rank: 'Chưa đạt' };
  };

  // Tổng hợp dữ liệu bảng điểm thuần túy từ các bài Quiz làm trên web
  const gradeRows: StudentGradeRow[] = students.map((st) => {
    const scores: Record<string, number | null> = {};
    let totalQuizScore = 0;
    let quizCount = 0;

    quizzes.forEach((q) => {
      const s = submissionsByQuiz[q.id]?.[st.id];
      scores[q.id] = s !== undefined ? s : null;
      if (s !== undefined) {
        totalQuizScore += s;
        quizCount++;
      }
    });

    const avgQuiz = quizCount > 0 ? Math.round((totalQuizScore / quizCount) * 10) / 10 : 0;
    const { letter, rank } = getLetterAndRank(avgQuiz);

    return {
      student: st,
      quizScores: scores,
      submittedCount: quizCount,
      averageQuizScore: avgQuiz,
      letterGrade: quizCount > 0 ? letter : '—',
      rank: quizCount > 0 ? rank : 'Chưa làm bài',
    };
  });

  // Thống kê toàn lớp
  const avgClassScore =
    gradeRows.length > 0
      ? (gradeRows.reduce((acc, r) => acc + r.averageQuizScore, 0) / gradeRows.length).toFixed(1)
      : '0.0';

  const passCount = gradeRows.filter((r) => r.averageQuizScore >= 4.0).length;
  const passRate = gradeRows.length > 0 ? Math.round((passCount / gradeRows.length) * 100) : 0;

  // Xuất file Excel chuẩn tổng hợp điểm Quiz
  const handleExportExcel = () => {
    const exportData: any[] = [];

    gradeRows.forEach((r, idx) => {
      const row: Record<string, any> = {
        'STT': idx + 1,
        'Mã Sinh Viên': r.student.student_code || '',
        'Họ và Tên': r.student.full_name,
        'Email': r.student.email,
        'Số Bài Đã Làm': `${r.submittedCount}/${quizzes.length}`,
      };

      quizzes.forEach((q) => {
        row[q.title] = r.quizScores[q.id] !== null ? r.quizScores[q.id] : 'Chưa làm';
      });

      row['Điểm TB Quizzes (Hệ 10)'] = r.averageQuizScore;
      row['Điểm Chữ'] = r.letterGrade;
      row['Xếp Loại'] = r.rank;

      exportData.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Diem_Quizzes_Lop');

    const fileName = `Bang_Diem_Quizzes_${(classInfo?.code || 'LOP')}_${(classInfo?.name || 'HocPhan').replace(/[\/:*?"<>|\s]+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/lecturer/classes/${params.id}`}
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {classInfo?.code || 'LOG101'}
                </span>
                <h1 className="font-bold text-lg text-white">Bảng Điểm Tổng Kết Học Phần</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {classInfo?.name} · Học kỳ: {classInfo?.semester}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportExcel}
              className="gradient-button px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Bảng Điểm Ra Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sĩ Số Lớp</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{students.length} sinh viên</h2>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm TB Quizzes Cả Lớp</p>
              <h2 className="text-3xl font-extrabold text-purple-400 mt-1">{avgClassScore} / 10</h2>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ Lệ Đạt (&ge; 4.0)</p>
              <h2 className="text-3xl font-extrabold text-emerald-400 mt-1">{passRate}%</h2>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Award className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Gradebook Table */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">Bảng Điểm Tổng Hợp Quizzes Của Lớp</h2>
              <p className="text-xs text-slate-400">
                Tổng hợp tất cả điểm bài thi / quiz được sinh viên làm trực tiếp trên hệ thống web
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">STT</th>
                  <th className="p-4">Mã Sinh Viên</th>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4 text-center">Số Bài Đã Làm</th>
                  {quizzes.map((q) => (
                    <th key={q.id} className="p-4 whitespace-nowrap">
                      {q.title.length > 25 ? `${q.title.slice(0, 25)}...` : q.title}
                    </th>
                  ))}
                  <th className="p-4 text-center">Điểm TB Quizzes</th>
                  <th className="p-4 text-center">Điểm Chữ</th>
                  <th className="p-4">Xếp Loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {gradeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6 + quizzes.length} className="p-8 text-center text-sm text-slate-500">
                      Chưa có sinh viên nào trong lớp này.
                    </td>
                  </tr>
                ) : (
                  gradeRows.map((r, idx) => (
                    <tr key={r.student.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-4 font-mono font-semibold text-indigo-400">{r.student.student_code}</td>
                      <td className="p-4 font-medium text-white">{r.student.full_name}</td>
                      <td className="p-4 text-center font-mono text-xs text-slate-300">
                        {r.submittedCount} / {quizzes.length}
                      </td>
                      {quizzes.map((q) => {
                        const sc = r.quizScores[q.id];
                        return (
                          <td key={q.id} className="p-4 font-mono">
                            {sc !== null && sc !== undefined ? (
                              <span className="font-bold text-emerald-400">{sc}</span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Chưa nộp</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-4 text-center font-mono font-black text-base text-purple-300">
                        {r.averageQuizScore}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-base">
                        <span className={`px-2 py-0.5 rounded-md text-xs ${
                          r.letterGrade === 'A'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.letterGrade === 'B'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : r.letterGrade === 'C'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : r.letterGrade === 'D'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {r.letterGrade}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {r.rank}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
