import Link from "next/link";
import { GraduationCap, ShieldAlert, Award, FileSpreadsheet, Clock, ArrowRight, UserCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">UniQuiz System</h1>
              <p className="text-xs text-slate-400 mt-1">Hệ Thống Kiểm Tra & Quản Lý Điểm Tự Động</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login/student"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sinh viên đăng nhập
            </Link>
            <Link
              href="/login/lecturer"
              className="gradient-button px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
            >
              <span>Cổng Giảng Viên</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 lg:py-24 text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-8">
          <Award className="w-4 h-4" />
          <span>Tự động hoá chấm điểm & Chống gian lận thông minh</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
          Hệ Thống Đánh Giá & Quản Lý Điểm Thi <span className="gradient-text">Xuyên Suốt Học Kỳ</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Tự động hoàn toàn công tác tổ chức bài thi trắc nghiệm, giám sát chuyển tab trực tuyến, tính điểm tự động và xuất báo cáo Excel cho từng lớp học phần.
        </p>

        {/* Portal Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-14 text-left">
          {/* Card: Giảng viên */}
          <div className="glass-card p-8 rounded-2xl hover:border-indigo-500/40 transition-all duration-300 group">
            <div className="p-3 w-fit rounded-xl bg-indigo-500/10 text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Dành Cho Giảng Viên</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Upload danh sách lớp từ Excel, khởi tạo đề thi trắc nghiệm, đặt giờ mở/đóng, kiểm soát thời điểm công bố điểm và xuất bảng điểm học phần.
            </p>
            <Link
              href="/login/lecturer"
              className="inline-flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300 space-x-2"
            >
              <span>Vào Bảng Điều Khiển Giảng Viên</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Card: Sinh viên */}
          <div className="glass-card p-8 rounded-2xl hover:border-purple-500/40 transition-all duration-300 group">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <UserCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Dành Cho Sinh Viên</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Đăng nhập bằng Mã Sinh Viên, tự động truy cập bài kiểm tra của các lớp học phần được gán, làm bài thi đồng hồ đếm ngược và xem lịch sử điểm.
            </p>
            <Link
              href="/login/student"
              className="inline-flex items-center text-sm font-semibold text-purple-400 hover:text-purple-300 space-x-2"
            >
              <span>Đăng Nhập Mã Sinh Viên</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="relative z-10 border-t border-slate-800/60 bg-slate-950/60 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="flex space-x-4 items-start">
            <div className="p-2.5 rounded-lg bg-slate-800/80 text-amber-400 mt-1">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Phát Hiện Chuyển Tab</h3>
              <p className="text-xs text-slate-400 mt-1">Giám sát rời màn hình làm bài realtime và lưu vết số lần vi phạm vào báo cáo của Giảng viên.</p>
            </div>
          </div>

          <div className="flex space-x-4 items-start">
            <div className="p-2.5 rounded-lg bg-slate-800/80 text-indigo-400 mt-1">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Công Bố Điểm Có Mật Độ</h3>
              <p className="text-xs text-slate-400 mt-1">Khóa kết quả bài thi sau khi nộp và chỉ mở công bố khi Giảng viên hoàn tất các ca thi.</p>
            </div>
          </div>

          <div className="flex space-x-4 items-start">
            <div className="p-2.5 rounded-lg bg-slate-800/80 text-emerald-400 mt-1">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Tự Động Xuất Excel</h3>
              <p className="text-xs text-slate-400 mt-1">Ghi nhận điểm số tức thì và cho phép xuất bảng điểm chuẩn định dạng Excel/CSV chỉ với 1 click.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 glass-panel py-6 text-center text-xs text-slate-500">
        © 2026 UniQuiz System - Tự động hoá quản lý điểm thi học phần Đại học.
      </footer>
    </main>
  );
}
