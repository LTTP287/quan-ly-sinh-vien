'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Users, Sparkles, Download, HelpCircle } from 'lucide-react';
import { UserProfile } from '@/types/database';

interface ExcelStudentImporterProps {
  classId: string;
  onImportSuccess: (importedStudents: UserProfile[]) => void;
}

export default function ExcelStudentImporter({ classId, onImportSuccess }: ExcelStudentImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Chuẩn hoá ô "Ngày sinh" trong Excel (chấp nhận DD/MM/YYYY, D-M-YYYY, hoặc
  // ngày serial của Excel) về ISO yyyy-mm-dd để gửi lên server làm mật khẩu.
  const parseDobToIso = (raw: string): string | undefined => {
    if (!raw) return undefined;
    const trimmed = raw.trim();

    const m = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    // Excel đôi khi trả về số serial ngày tháng thay vì chuỗi
    if (/^\d{4,6}$/.test(trimmed)) {
      const parsed = XLSX.SSF.parse_date_code(Number(trimmed));
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }

    return undefined;
  };

  // Helper to normalize column names
  const normalizeKey = (key: any): string => {
    if (!key) return '';
    return String(key)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip Vietnamese diacritics for matching
      .replace(/[^a-z0-9]/g, '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Không thể đọc dữ liệu file');

        const wb = XLSX.read(data, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        // Convert sheet to 2D array of raw values to detect header row dynamically
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawRows || rawRows.length === 0) {
          setError('File Excel hoàn toàn trống.');
          return;
        }

        // Find header row index (scanning first 15 rows)
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
          const rowText = (rawRows[r] || []).map((cell) => normalizeKey(cell)).join(' ');
          if (
            rowText.includes('masv') ||
            rowText.includes('mssv') ||
            rowText.includes('sinhvien') ||
            rowText.includes('hoten') ||
            rowText.includes('name') ||
            rowText.includes('code')
          ) {
            headerRowIdx = r;
            break;
          }
        }

        // Extract header keys and data rows
        const headerRow = rawRows[headerRowIdx] || [];
        const dataRows = rawRows.slice(headerRowIdx + 1);

        const students: UserProfile[] = [];

        dataRows.forEach((rowArray, rowIdx) => {
          if (!rowArray || rowArray.length === 0) return;

          let studentCode = '';
          let fullName = '';
          let hoDem = '';
          let ten = '';
          let dob = '';

          // 1. Try matching by header name
          headerRow.forEach((colName, colIdx) => {
            const val = String(rowArray[colIdx] || '').trim();
            if (!val) return;

            const normKey = normalizeKey(colName);
            if (
              normKey.includes('masv') ||
              normKey.includes('mssv') ||
              normKey.includes('studentcode') ||
              normKey.includes('mahocvien') ||
              normKey === 'code' ||
              normKey === 'ms'
            ) {
              studentCode = val;
            } else if (
              normKey.includes('hoten') ||
              normKey.includes('hovaten') ||
              normKey.includes('fullname') ||
              normKey === 'ten'
            ) {
              fullName = val;
            } else if (normKey.includes('hodem') || normKey.includes('ho')) {
              hoDem = val;
            } else if (normKey === 'ten' || normKey === 'name') {
              ten = val;
            } else if (
              normKey.includes('ngaysinh') ||
              normKey.includes('namsinh') ||
              normKey.includes('dateofbirth') ||
              normKey === 'dob'
            ) {
              dob = val;
            }
          });

          // Fallback: If split 'Họ' and 'Tên' columns exist
          if (!fullName && (hoDem || ten)) {
            fullName = `${hoDem} ${ten}`.trim();
          }

          // 2. Fallback matching by value pattern if header keys failed
          if (!studentCode || !fullName) {
            rowArray.forEach((cellVal) => {
              const strVal = String(cellVal || '').trim();
              if (!strVal) return;

              // If value looks like student ID (digits/letters 6-12 chars)
              if (!studentCode && /^[A-Za-z0-9]{5,15}$/.test(strVal) && /\d/.test(strVal)) {
                studentCode = strVal;
              } else if (!fullName && strVal.length >= 3 && /[a-zA-ZÀ-ỹ]/.test(strVal) && !strVal.includes('@')) {
                fullName = strVal;
              }
            });
          }

          if (studentCode || fullName) {
            const finalCode = (studentCode || `SV2025_${rowIdx + 1}`).toUpperCase();
            const finalName = fullName || `Sinh Viên ${finalCode}`;
            const email = `${finalCode.toLowerCase()}@student.university.edu.vn`;

            students.push({
              id: `imported-${finalCode}-${rowIdx}`,
              email,
              student_code: finalCode,
              full_name: finalName,
              role: 'student',
              date_of_birth: parseDobToIso(dob),
              created_at: new Date().toISOString(),
            });
          }
        });

        if (students.length === 0) {
          setError('Không tìm thấy cột Mã SV / Họ Tên hợp lệ. Thầy/Cô vui lòng tải Mẫu Excel Chuẩn ở bên dưới.');
          return;
        }

        setParsedStudents(students);
      } catch (err: any) {
        setError(`Lỗi đọc file: ${err.message || 'File Excel không đúng cấu trúc'}`);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Generate Sample Excel Template for Teacher
  const downloadSampleTemplate = () => {
    const sampleData = [
      { 'Mã SV': '20120001', 'Họ và Tên': 'Nguyễn Văn An', 'Ngày sinh': '15/01/2004' },
      { 'Mã SV': '20120002', 'Họ và Tên': 'Lê Thị Bình', 'Ngày sinh': '22/03/2004' },
      { 'Mã SV': '20120003', 'Họ và Tên': 'Phạm Hoàng Cường', 'Ngày sinh': '05/11/2003' },
      { 'Mã SV': '20120004', 'Họ và Tên': 'Tran Thi Dung', 'Ngày sinh': '30/07/2004' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachSinhVien');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Sinh_Vien.xlsx');
  };

  const handleConfirmImport = async () => {
    if (parsedStudents.length === 0) return;
    setUploading(true);
    try {
      onImportSuccess(parsedStudents);
      setSuccessCount(parsedStudents.length);
      setFile(null);
      setParsedStudents([]);
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu danh sách sinh viên.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Import Danh Sách Sinh Viên Từ Excel</h3>
            <p className="text-xs text-slate-400">Hỗ trợ tự động đọc mọi định dạng file Excel (.xlsx, .xls, .csv)</p>
          </div>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center space-x-2 w-fit"
        >
          <Download className="w-4 h-4" />
          <span>Tải File Excel Mẫu Chuẩn</span>
        </button>
      </div>

      {successCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Thành công! Đã nạp <strong>{successCount} sinh viên</strong> vào danh sách lớp học phần!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 text-red-400 text-sm">
          <div className="flex items-center space-x-2 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <p className="text-xs text-slate-300 pl-7">
            💡 Gợi ý: Bấm nút <strong>"Tải File Excel Mẫu Chuẩn"</strong> ở trên để tải file mẫu chuẩn về máy, copy danh sách sinh viên của Thầy/Cô vào file đó rồi upload lại.
          </p>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      {parsedStudents.length === 0 ? (
        <label className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
          <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-3 group-hover:scale-110 transition-all" />
          <span className="text-sm font-semibold text-slate-200">
            Nhấp vào đây để chọn file Excel từ máy tính của bạn (.xlsx, .xls, .csv)
          </span>
          <span className="text-xs text-slate-400 mt-2">
            * Tự động nhận diện mọi tiêu đề cột: <code className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">Mã SV / MSSV</code>, <code className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">Họ và Tên</code>, <code className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">Ngày sinh</code> (DD/MM/YYYY — dùng làm mật khẩu đăng nhập)
          </span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        /* Preview Table Before Import */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-sm text-slate-200 font-medium">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Thành công: Đã tìm thấy <strong>{parsedStudents.length} sinh viên</strong> trong file Excel</span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setParsedStudents([]);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đổi file khác</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Mã Sinh Viên</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Ngày Sinh</th>
                  <th className="p-3">Email Trường</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {parsedStudents.map((st, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-mono font-semibold text-indigo-400">{st.student_code}</td>
                    <td className="p-3 text-white font-medium">{st.full_name}</td>
                    <td className="p-3 font-mono text-[11px]">
                      {st.date_of_birth ? (
                        new Date(st.date_of_birth).toLocaleDateString('vi-VN')
                      ) : (
                        <span className="text-amber-400">Thiếu — không đăng nhập được</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{st.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={handleConfirmImport}
              disabled={uploading}
              className="gradient-button px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-2"
            >
              {uploading ? (
                <span>Đang lưu danh sách...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Xác Nhận Import {parsedStudents.length} Sinh Viên Vào Lớp</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
