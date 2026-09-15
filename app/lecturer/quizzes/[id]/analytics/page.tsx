'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, FileSpreadsheet, Download, Eye, EyeOff, 
  Award, TrendingUp, Users, ShieldAlert, CheckCircle2, Lock,
  X, CheckCircle, XCircle, FileText, Clock, AlertTriangle,
  Edit3, Save, MessageSquare, Check, Sparkles, RotateCcw, Unlock
} from 'lucide-react';
import { Quiz, Submission } from '@/types/database';
import { getQuiz, listSubmissions, setShowResults } from '@/lib/data';

export default function QuizAnalyticsPage({ params }: { params: { id: string } }) {
  // Dữ liệu thật lấy từ Test Bank + bài nộp của sinh viên (không còn dữ liệu mẫu)
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);

  // State cho Modal chi tiết bài làm & bằng chứng vi phạm
  const [selectedStudentSubmission, setSelectedStudentSubmission] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State phục vụ Giảng viên chấm câu hỏi ngắn & tự luận dài
  const [manualGrades, setManualGrades] = useState<Record<string, { score: number; feedback: string }>>({});
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeSuccessMsg, setGradeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setQuiz(await getQuiz(params.id));
        setSubmissions(await listSubmissions(params.id));
      } catch (err) {
        console.error('Không tải được dữ liệu bài nộp', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [params.id]);

  const handleOpenDetail = async (studentId: string) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    setGradeSuccessMsg(null);
    try {
      const res = await fetch(`/api/lecturer/submission-detail?quiz_id=${params.id}&student_id=${studentId}`);
      if (!res.ok) throw new Error('Không tải được chi tiết bài làm.');
      const data = await res.json();
      setSelectedStudentSubmission(data);

      const initialGrades: Record<string, { score: number; feedback: string }> = {};
      if (Array.isArray(data.questions)) {
        data.questions.forEach((q: any) => {
          const defaultScore = (q.score_awarded !== null && q.score_awarded !== undefined)
            ? Number(q.score_awarded)
            : (q.question_type === 'short_answer' || q.question_type === 'long_answer')
              ? 0 // Mặc định 0đ cho câu tự luận/ngắn khi chưa được giảng viên chấm
              : (q.is_correct ? Number(q.points) || 0.2 : 0);
          initialGrades[q.id] = {
            score: defaultScore,
            feedback: q.feedback || '',
          };
        });
      }
      setManualGrades(initialGrades);
    } catch (err: any) {
      alert(err?.message || 'Lỗi tải bài làm');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleScoreChange = (questionId: string, value: number, maxPoints: number) => {
    const valid = Math.min(maxPoints, Math.max(0, Math.round(value * 100) / 100));
    setManualGrades((prev) => ({
      ...prev,
      [questionId]: {
        score: valid,
        feedback: prev[questionId]?.feedback || '',
      },
    }));
  };

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setManualGrades((prev) => ({
      ...prev,
      [questionId]: {
        score: prev[questionId]?.score ?? 0,
        feedback,
      },
    }));
  };

  const calculateCurrentTotalScore = () => {
    if (!selectedStudentSubmission?.questions) return 0;
    let sum = 0;
    selectedStudentSubmission.questions.forEach((q: any) => {
      if (manualGrades[q.id]?.score !== undefined) {
        sum += manualGrades[q.id].score;
      } else if (q.score_awarded !== null && q.score_awarded !== undefined) {
        sum += Number(q.score_awarded);
      } else if (q.is_correct) {
        sum += Number(q.points) || 0.2;
      }
    });
    return Math.min(10, Math.max(0, Math.round(sum * 10) / 10));
  };

  const handleSaveGrades = async () => {
    if (!selectedStudentSubmission) return;
    setIsSavingGrade(true);
    setGradeSuccessMsg(null);
    try {
      const gradesPayload = Object.entries(manualGrades).map(([qId, g]) => ({
        question_id: qId,
        score_awarded: g.score,
        feedback: g.feedback,
      }));

      const res = await fetch('/api/lecturer/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: params.id,
          student_id: selectedStudentSubmission.student.id,
          grades: gradesPayload,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Không thể lưu điểm chấm.');

      const newScore = resData.total_score;
      const targetStudentId = resData.student_id || selectedStudentSubmission.student.id;
      const targetStudentCode = (resData.student_code || selectedStudentSubmission.student.student_code || targetStudentId.replace(/^st-/, '')).trim().toUpperCase();

      setGradeSuccessMsg(`Đã lưu điểm chấm thành công! Tổng điểm mới của sinh viên: ${newScore}/10 điểm.`);

      setSelectedStudentSubmission((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          submission: {
            ...prev.submission,
            total_score: newScore,
          },
        };
      });

      setSubmissions((prev) =>
        prev.map((s) => {
          const sCode = (s.student?.student_code || (s as any).student_code || s.student_id.replace(/^st-/, '')).trim().toUpperCase();
          if (
            s.student_id === targetStudentId ||
            s.student?.id === targetStudentId ||
            s.student_id === selectedStudentSubmission.student.id ||
            s.student?.id === selectedStudentSubmission.student.id ||
            (targetStudentCode && sCode === targetStudentCode)
          ) {
            return { ...s, total_score: newScore };
          }
          return s;
        })
      );

      // Đồng bộ ngay điểm mới vào classStore (localStorage) để Bảng Điểm Tổng Kết Học Phần cập nhật tức thì
      try {
        const { getSubmissionsByQuiz, saveStoredSubmission } = await import('@/lib/classStore');
        const localList = getSubmissionsByQuiz(params.id);
        const target = localList.find((ls: any) => {
          if (ls.student_id === targetStudentId || ls.student_id === selectedStudentSubmission.student.id) return true;
          const lsCode = (ls.student?.student_code || ls.student_code || ls.student_id.replace(/^st-/, '')).trim().toUpperCase();
          return targetStudentCode && lsCode === targetStudentCode;
        });
        if (target) {
          target.total_score = newScore;
          saveStoredSubmission(target);
        }
      } catch {}
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu điểm');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Mở khóa phòng thi / Cho phép sinh viên làm lại bài
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlockStudent = async (studentId: string, studentName?: string) => {
    const confirmMsg = `Bạn có chắc chắn muốn MỞ KHÓA THI LẠI cho sinh viên "${studentName || studentId}"?\n\n• Bài nộp cũ và lịch sử vi phạm sẽ được reset.\n• Sinh viên sẽ có thể nhập lại mã phòng thi để vào làm bài.`;
    if (!confirm(confirmMsg)) return;

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/lecturer/unlock-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: params.id,
          student_id: studentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mở khóa thất bại.');

      // Xóa khỏi danh sách submissions hiển thị
      const cleanCode = studentId.replace(/^st-/, '').trim().toUpperCase();
      setSubmissions((prev) =>
        prev.filter((s) => {
          if (s.student_id === studentId) return false;
          const sc = (s.student?.student_code || (s as any).student_code || s.student_id.replace(/^st-/, '')).trim().toUpperCase();
          if (cleanCode && (sc === cleanCode || s.student_id.includes(cleanCode))) return false;
          return true;
        })
      );

      // Xóa cả trong classStore (localStorage)
      try {
        const { deleteStoredSubmission } = await import('@/lib/classStore');
        deleteStoredSubmission(params.id, studentId);
        if (cleanCode) {
          deleteStoredSubmission(params.id, `st-${cleanCode.toLowerCase()}`);
          deleteStoredSubmission(params.id, cleanCode);
        }
      } catch {}

      // Nếu đang mở modal của sinh viên này thì đóng lại
      if (selectedStudentSubmission && (selectedStudentSubmission.student.id === studentId || selectedStudentSubmission.student.student_code === cleanCode)) {
        setShowDetailModal(false);
        setSelectedStudentSubmission(null);
      }

      alert(`Đã mở khóa thành công cho sinh viên ${studentName || studentId}! Sinh viên này có thể vào lại phòng thi để làm bài.`);
    } catch (err: any) {
      alert(`Lỗi mở khóa: ${err.message || err}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  // Công bố / khóa điểm và LƯU LẠI vào Test Bank để sinh viên nhìn thấy
  const handleToggleShowResults = async () => {
    if (!quiz) return;
    const next = !quiz.show_results;
    try {
      await setShowResults(quiz.id, next);
      setQuiz({ ...quiz, show_results: next });
    } catch (err: any) {
      alert(`Không cập nhật được trạng thái công bố điểm: ${err?.message || err}`);
    }
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
    XLSX.writeFile(workbook, `Bang_Diem_${(quiz?.title || 'Quiz').replace(/[\/:*?"<>|\s]+/g, '_')}.xlsx`);
  };

  const avgScore =
    submissions.length > 0
      ? (submissions.reduce((acc, s) => acc + (s.total_score || 0), 0) / submissions.length).toFixed(1)
      : '0.0';

  const passRate =
    submissions.length > 0
      ? Math.round((submissions.filter((s) => (s.total_score || 0) >= 5).length / submissions.length) * 100)
      : 0;

  if (loaded && !quiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="glass-card p-8 rounded-2xl border border-slate-800 max-w-md text-center space-y-4">
          <h1 className="text-lg font-bold">Không tìm thấy bài quiz này</h1>
          <p className="text-sm text-slate-400">Đề thi có thể đã bị xóa khỏi Test Bank.</p>
          <Link href="/lecturer/quizzes" className="gradient-button inline-block px-5 py-2.5 rounded-xl text-sm font-bold">
            Về danh sách đề thi
          </Link>
        </div>
      </div>
    );
  }

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
              <p className="text-xs text-slate-400 mt-0.5">{quiz?.title || 'Đang tải...'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Toggle Show Results button */}
            <button
              onClick={handleToggleShowResults}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all ${
                quiz?.show_results
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {quiz?.show_results ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{quiz?.show_results ? 'Đã Công Bố Điểm Cho Sinh Viên' : 'Mở Đã Khóa Điểm (Bấm Để Công Bố)'}</span>
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
              <h2 className="text-3xl font-extrabold text-emerald-400 mt-1">{passRate}%</h2>
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
                  <th className="p-4 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
                      Chưa có sinh viên nào nộp bài cho đề thi này.
                    </td>
                  </tr>
                )}
                {submissions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="p-4 font-mono font-semibold text-indigo-400">{s.student?.student_code}</td>
                    <td className="p-4 font-medium text-white">
                      <button
                        onClick={() => handleOpenDetail(s.student_id)}
                        className="text-left font-semibold text-white hover:text-indigo-400 hover:underline transition-colors"
                        title="Bấm để xem chi tiết bài làm & bằng chứng vi phạm"
                      >
                        {s.student?.full_name}
                      </button>
                    </td>
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
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenDetail(s.student_id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Chấm & Xem Bài</span>
                        </button>
                        <button
                          onClick={() => handleUnlockStudent(s.student_id, s.student?.full_name)}
                          disabled={isUnlocking}
                          title="Xóa bài thi cũ, cho phép sinh viên vào phòng thi làm lại"
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cho Thi Lại</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Chi Tiết Bài Làm & Bằng Chứng Vi Phạm Thời Gian Thực */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Chi Tiết Bài Làm & Hồ Sơ Giám Sát Phòng Thi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sinh viên: <strong className="text-white">{selectedStudentSubmission?.student?.full_name || '...'}</strong> · MSSV: <strong className="text-indigo-400">{selectedStudentSubmission?.student?.student_code || '...'}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {selectedStudentSubmission?.student && (
                  <button
                    onClick={() => handleUnlockStudent(selectedStudentSubmission.student.id, selectedStudentSubmission.student.full_name)}
                    disabled={isUnlocking}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Mở Khóa Cho Thi Lại</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedStudentSubmission(null);
                  }}
                  className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetail ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm">Đang tải dữ liệu bài làm và lịch sử vi phạm...</p>
                </div>
              ) : selectedStudentSubmission ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Điểm Bài Thi</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                        {selectedStudentSubmission.submission.total_score} <span className="text-sm text-slate-500">/ 10</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Số Lần Rời Màn Hình</p>
                      <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                        {selectedStudentSubmission.submission.tab_violations_count} <span className="text-sm text-slate-500">lần vi phạm</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Thời Gian Nộp</p>
                      <p className="text-sm font-semibold text-white mt-1">
                        {selectedStudentSubmission.submission.submitted_at
                          ? new Date(selectedStudentSubmission.submission.submitted_at).toLocaleString('vi-VN')
                          : 'Chưa hoàn thành'}
                      </p>
                    </div>
                  </div>

                  {/* Violation Evidence Section */}
                  <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <h4 className="font-bold text-sm text-white uppercase tracking-wider">
                        Bằng Chứng Vi Phạm Thời Gian Thực (Audit Log)
                      </h4>
                    </div>

                    {selectedStudentSubmission.submission.warning_history && selectedStudentSubmission.submission.warning_history.length > 0 ? (
                      <div className="overflow-x-auto border border-amber-500/20 rounded-xl bg-amber-500/5">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="border-b border-amber-500/20 text-amber-400 uppercase">
                            <tr>
                              <th className="p-3">Lần</th>
                              <th className="p-3">Mốc Thời Gian</th>
                              <th className="p-3">Loại Sự Kiện</th>
                              <th className="p-3">Mô Tả Vi Phạm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-500/10 font-mono">
                            {selectedStudentSubmission.submission.warning_history.map((vh: any, vi: number) => (
                              <tr key={vi} className="hover:bg-amber-500/10">
                                <td className="p-3 text-amber-300 font-bold">{vi + 1}</td>
                                <td className="p-3 text-slate-300">
                                  {new Date(vh.timestamp).toLocaleTimeString('vi-VN')} ({new Date(vh.timestamp).toLocaleDateString('vi-VN')})
                                </td>
                                <td className="p-3 text-amber-400">{vh.event || 'visibility_hidden'}</td>
                                <td className="p-3 text-slate-200">{vh.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>Không phát hiện vi phạm nào. Sinh viên hoàn thành bài thi nghiêm túc trong suốt thời gian mở đề.</span>
                      </div>
                    )}
                  </div>

                  {/* Question Paper Review & Manual Grading Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>Chi Tiết Đề Thi & Chấm Bài ({selectedStudentSubmission.questions.length} câu)</span>
                      </h4>
                      <span className="text-xs text-slate-400">
                        Phần trắc nghiệm tự động chấm · Phần câu ngắn & tự luận Giảng viên có thể điều chỉnh điểm
                      </span>
                    </div>

                    {selectedStudentSubmission.questions.map((q: any, qIdx: number) => {
                      const isManualGradable = q.question_type === 'short_answer' || q.question_type === 'long_answer';
                      const currentScore = manualGrades[q.id]?.score ?? (q.score_awarded !== null && q.score_awarded !== undefined ? q.score_awarded : (q.is_correct ? q.points : 0));
                      const currentFeedback = manualGrades[q.id]?.feedback ?? q.feedback ?? '';

                      return (
                        <div key={q.id || qIdx} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start space-x-2.5">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                Câu {qIdx + 1}
                              </span>
                              <div>
                                {q.question_type === 'short_answer' && (
                                  <span className="inline-block mr-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Câu hỏi ngắn
                                  </span>
                                )}
                                {q.question_type === 'long_answer' && (
                                  <span className="inline-block mr-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    Tự luận dài
                                  </span>
                                )}
                                <span className="font-medium text-sm text-white leading-relaxed">
                                  {q.question_text}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {isManualGradable ? (
                                <span className="text-xs font-bold px-3 py-1 rounded-full border bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                                  {currentScore} / {q.points} điểm
                                </span>
                              ) : (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                                  q.is_correct
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {q.is_correct ? `+${q.points} điểm` : '0 điểm'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            {isManualGradable ? (
                              <div className="space-y-3">
                                {/* Student's text answer */}
                                <div>
                                  <p className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Bài làm của sinh viên:
                                  </p>
                                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                    {q.answer_text?.trim() ? (
                                      q.answer_text
                                    ) : (
                                      <span className="text-slate-500 italic">(Sinh viên không nhập câu trả lời)</span>
                                    )}
                                  </div>
                                </div>

                                {/* Lecturer grading controls */}
                                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center space-x-2">
                                      <Edit3 className="w-4 h-4 text-indigo-400" />
                                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                        Chấm điểm câu này:
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={q.points}
                                        step="0.1"
                                        value={manualGrades[q.id]?.score ?? currentScore}
                                        onChange={(e) => handleScoreChange(q.id, parseFloat(e.target.value) || 0, q.points)}
                                        className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-center font-mono font-bold text-emerald-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                      <span className="text-xs font-semibold text-slate-400">/ {q.points}đ</span>

                                      {/* Quick point buttons */}
                                      <div className="flex items-center space-x-1 pl-2">
                                        <button
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, 0, q.points)}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-400 transition-colors"
                                        >
                                          0đ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, Math.round((q.points * 0.5) * 10) / 10, q.points)}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-400 transition-colors"
                                        >
                                          50% ({Math.round((q.points * 0.5) * 10) / 10}đ)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleScoreChange(q.id, q.points, q.points)}
                                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 transition-colors"
                                        >
                                          Tối đa ({q.points}đ)
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lecturer feedback */}
                                  <div>
                                    <textarea
                                      rows={2}
                                      placeholder="Nhập nhận xét / lời phê cho câu trả lời này (tùy chọn)..."
                                      value={manualGrades[q.id]?.feedback ?? currentFeedback}
                                      onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                                      className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {q.options?.map((opt: any, optIdx: number) => {
                                  const label = String.fromCharCode(65 + optIdx);
                                  const isSelected = opt.is_selected;
                                  const isCorrect = opt.is_correct;

                                  let style = 'border-slate-800 bg-slate-950/60 text-slate-400';
                                  if (isSelected && isCorrect) {
                                    style = 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold ring-1 ring-emerald-500/30';
                                  } else if (isSelected && !isCorrect) {
                                    style = 'border-rose-500/50 bg-rose-500/15 text-rose-300 font-semibold ring-1 ring-rose-500/30';
                                  } else if (isCorrect) {
                                    style = 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400';
                                  }

                                  return (
                                    <div
                                      key={opt.id || optIdx}
                                      className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${style}`}
                                    >
                                      <span className="font-mono font-bold shrink-0">{label}.</span>
                                      <div className="flex-1">
                                        <span>{opt.option_text}</span>
                                        {isSelected && (
                                          <span className="block mt-1 text-[10px] font-sans font-bold text-indigo-300">
                                            [Sinh viên chọn]
                                          </span>
                                        )}
                                        {isCorrect && !isSelected && (
                                          <span className="block mt-1 text-[10px] font-sans text-emerald-400">
                                            [Đáp án đúng]
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer with Live Score and Save Button */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Tổng điểm sau chấm:</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {calculateCurrentTotalScore()}
                  </span>
                  <span className="text-xs text-slate-500">/ 10.0</span>
                </div>
                {gradeSuccessMsg && (
                  <span className="text-xs font-semibold text-emerald-400 animate-in fade-in flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{gradeSuccessMsg}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveGrades}
                  disabled={isSavingGrade}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 flex items-center space-x-2 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingGrade ? 'Đang lưu điểm...' : 'Lưu Điểm Chấm & Nhận Xét'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedStudentSubmission(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Đóng Cửa Sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
