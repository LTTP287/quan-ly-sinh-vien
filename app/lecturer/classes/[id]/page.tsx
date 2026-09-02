'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Users, FileSpreadsheet, Plus, Search, 
  Trash2, UserCheck, GraduationCap, CheckCircle 
} from 'lucide-react';
import ExcelStudentImporter from '@/components/ExcelStudentImporter';
import { UserProfile, ClassModule } from '@/types/database';
import { getClass, listStudents, importStudents, removeStudent } from '@/lib/data';

export default function ClassDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [showImporter, setShowImporter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [classInfo, setClassInfo] = useState<ClassModule>({
    id: params.id,
    code: 'INT3306',
    name: 'Lớp Học Phần',
    semester: 'HKI (2026 - 2027)',
    lecturer_id: 'lecturer-id',
    created_at: new Date().toISOString(),
  });

  const [students, setStudents] = useState<UserProfile[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const cls = await getClass(params.id);
        if (cls) setClassInfo(cls);
        setStudents(await listStudents(params.id));
      } catch (err) {
        console.error('Không tải được dữ liệu lớp', err);
      }
    })();
  }, [params.id]);

  const handleImportSuccess = async (imported: UserProfile[]) => {
    try {
      // Ở chế độ Supabase, hàm này gọi /api/students/import để TẠO TÀI KHOẢN
      // sinh viên bằng service-role key rồi ghi danh vào lớp.
      const result = await importStudents(
        params.id,
        imported.map((s) => ({
          student_code: s.student_code || '',
          full_name: s.full_name,
          email: s.email,
          date_of_birth: s.date_of_birth || undefined,
        }))
      );

      const updated = await listStudents(params.id);
      setStudents(updated);
      setClassInfo((prev) => ({ ...prev, students_count: updated.length }));

      if (result.errors?.length) {
        alert([`Import xong nhưng có ${result.errors.length} cảnh báo/lỗi:`, ...result.errors.slice(0, 5)].join('\n'));
      } else if (result.created > 0) {
        alert(`Đã tạo ${result.created} hồ sơ sinh viên. Mật khẩu đăng nhập là ngày sinh (định dạng DD/MM/YYYY).`);
      }
    } catch (err: any) {
      alert(`Import thất bại: ${err?.message || err}`);
    }
  };

  const handleDeleteStudent = async (stId: string) => {
    try {
      const updated = await removeStudent(params.id, stId);
      setStudents(updated);
      setClassInfo((prev) => ({ ...prev, students_count: updated.length }));
    } catch (err: any) {
      alert(`Không xóa được sinh viên: ${err?.message || err}`);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.student_code && s.student_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
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
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {classInfo.code}
                </span>
                <h1 className="font-bold text-lg text-white">{classInfo.name}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Học kỳ: {classInfo.semester}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImporter(!showImporter)}
              className="gradient-button px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{showImporter ? 'Đóng Công Cụ Import' : 'Import Danh Sách Excel'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Import Tool Accordion */}
        {showImporter && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <ExcelStudentImporter classId={params.id} onImportSuccess={handleImportSuccess} />
          </div>
        )}

        {/* Student Roster Section */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Danh Sách Sinh Viên Lớp Học Phần</h2>
                <p className="text-xs text-slate-400">Tự động lưu vĩnh viễn & cho phép Sinh viên đăng nhập làm bài bằng Mã SV</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-medium">
                Sĩ số: <strong className="text-indigo-400">{students.length} sinh viên</strong>
              </span>
              <div className="relative w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm theo MSSV hoặc tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">STT</th>
                  <th className="p-4">Mã Sinh Viên</th>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4">Ngày Sinh (Mật khẩu)</th>
                  <th className="p-4">Email Trường</th>
                  <th className="p-4">Trạng Thái Đăng Nhập</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                      Chưa có sinh viên nào. Bấm nút <strong>Import Danh Sách Excel</strong> ở trên để nạp sinh viên.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-4 font-mono font-semibold text-indigo-400">{st.student_code}</td>
                      <td className="p-4 font-medium text-white">{st.full_name}</td>
                      <td className="p-4 font-mono text-xs">
                        {st.date_of_birth ? (
                          new Date(st.date_of_birth).toLocaleDateString('vi-VN')
                        ) : (
                          <span className="text-amber-400">Thiếu — không đăng nhập được</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400 text-xs">{st.email}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Đã kích hoạt</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteStudent(st.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                          title="Xóa khỏi lớp"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
