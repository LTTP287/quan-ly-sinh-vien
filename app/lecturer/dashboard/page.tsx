'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, BookOpen, Users, FileCheck2, Plus, 
  ArrowRight, LogOut, Sparkles, FolderPlus, Search 
} from 'lucide-react';
import { ClassModule, UserProfile } from '@/types/database';
import { listClasses, listQuizzes, createClass, getCurrentUser, signOut } from '@/lib/data';

export default function LecturerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<ClassModule[]>([]);
  const [quizCount, setQuizCount] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSemester, setNewSemester] = useState('HKI (2026 - 2027)');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (u?.role === 'lecturer') setUser(u);

      try {
        setClasses(await listClasses());
        setQuizCount((await listQuizzes()).length);
      } catch (err) {
        console.error('Không tải được dữ liệu lớp học phần', err);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    try {
      const updated = await createClass({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        semester: newSemester,
      });
      setClasses(updated);
      setNewCode('');
      setNewName('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert(`Không tạo được lớp: ${err?.message || err}`);
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 glass-panel sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Bảng Điều Khiển Giảng Viên</h1>
              <p className="text-xs text-slate-400 mt-1">Xin chào, {user?.full_name || 'TS. Nguyễn Văn A'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/lecturer/quizzes"
              className="px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-sm font-semibold flex items-center space-x-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Thư Viện Test Bank Dùng Chung</span>
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="gradient-button px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lớp Học Phần Mới</span>
            </button>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Lớp Học Phần</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{classes.length}</h2>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Sinh Viên Quản Lý</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">
                {classes.reduce((acc, c) => acc + (c.students_count || 0), 0)}
              </h2>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bài Quiz Đã Khởi Tạo</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{quizCount}</h2>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
              <FileCheck2 className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Classes Roster Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Danh Sách Lớp Học Phần</h2>
            <p className="text-sm text-slate-400 mt-1">Quản lý sinh viên, thêm danh sách Excel và khởi tạo bài kiểm tra</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Classes Roster Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {cls.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{cls.semester}</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {cls.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Sĩ số: <strong>{cls.students_count || 0} sinh viên</strong></span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
                <Link
                  href={`/lecturer/classes/${cls.id}`}
                  className="inline-flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300 space-x-2"
                >
                  <span>Quản lý lớp & Import Excel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex items-center space-x-2">
                  <Link
                    href="/lecturer/quizzes/new"
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 border border-indigo-500/20 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Quiz</span>
                  </Link>

                  <Link
                    href="/lecturer/quizzes"
                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold text-purple-300 border border-purple-500/20 flex items-center space-x-1"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Thống kê điểm & Excel</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal: Create Class */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-2xl border border-slate-800 w-full max-w-md space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Thêm Lớp Học Phần Mới</h3>
                <p className="text-xs text-slate-400">Khởi tạo mã môn và tên học phần</p>
              </div>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Mã Lớp Học Phần
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: INT3306"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Tên Học Phần / Lớp
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lập Trình Web Nâng Cao"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Học Kỳ
                </label>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="HKI (2026 - 2027)">HKI (2026 - 2027)</option>
                  <option value="HKII (2026 - 2027)">HKII (2026 - 2027)</option>
                  <option value="Học kỳ Hè (2026 - 2027)">Học kỳ Hè (2026 - 2027)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="gradient-button px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Khởi Tạo Lớp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
