import Link from 'next/link';
import { GraduationCap, ArrowRight, UserCheck, Sparkles, Rocket, Menu } from 'lucide-react';

// Clay-card: viền dày + đổ bóng cứng (không blur) — đặc trưng phong cách claymorphism
const CLAY = 'border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] rounded-3xl';
const CLAY_SM = 'border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-2xl';
const CLAY_BTN =
  'border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-full transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0f172a] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#0f172a]';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFF4E6] text-slate-900 overflow-x-hidden">
      {/* Background blobs vui mắt, không blur mạnh để giữ nét claymorphism */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-72 h-72 bg-amber-200 rounded-full opacity-70" />
      <div className="pointer-events-none fixed top-1/3 -right-32 w-96 h-96 bg-sky-200 rounded-full opacity-60" />
      <div className="pointer-events-none fixed bottom-0 left-1/4 w-64 h-64 bg-emerald-200 rounded-full opacity-50" />

      {/* Navbar dạng viên thuốc nổi, giống tham chiếu thiết kế */}
      <header className="sticky top-4 z-30 px-4">
        <div className={`max-w-6xl mx-auto bg-white ${CLAY_SM} px-5 h-16 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-200 border-[3px] border-slate-900 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">UniQuiz System</span>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <Link href="/login/student" className="text-sm font-bold hover:text-emerald-600 transition-colors">
              Sinh viên đăng nhập
            </Link>
            <Link
              href="/login/lecturer"
              className={`bg-sky-200 ${CLAY_BTN} px-4 py-2 text-sm font-bold flex items-center space-x-1.5`}
            >
              <span>Cổng Giảng Viên</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button className="md:hidden w-10 h-10 rounded-xl bg-slate-100 border-[3px] border-slate-900 flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 bg-emerald-200 ${CLAY_SM} text-xs font-bold mb-8`}>
          <Sparkles className="w-4 h-4" />
          <span>Mới: Đăng nhập MSSV + Ngày sinh, khóa 1 thiết bị/phiên</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
          Học Thật, <span className="text-emerald-500">Thi Vui</span>,<br />Điểm Số Minh Bạch!
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed">
          Nền tảng thi trắc nghiệm &amp; quản lý điểm học phần: rút đề ngẫu nhiên, khóa mã phòng thi
          theo khung giờ, chống chuyển tab, và công bố điểm đúng lúc Giảng viên cho phép.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login/student"
            className={`w-full sm:w-auto bg-emerald-400 ${CLAY_BTN} px-8 py-4 text-base font-extrabold flex items-center justify-center space-x-2`}
          >
            <Rocket className="w-5 h-5" />
            <span>Vào Học Ngay</span>
          </Link>
          <Link
            href="/login/lecturer"
            className={`w-full sm:w-auto bg-sky-200 ${CLAY_BTN} px-8 py-4 text-base font-extrabold flex items-center justify-center space-x-2`}
          >
            <GraduationCap className="w-5 h-5" />
            <span>Cổng Giảng Viên</span>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { n: '20+', l: 'Lớp Học Phần' },
            { n: '500+', l: 'Sinh Viên' },
            { n: '99.9%', l: 'Chấm Điểm Đúng' },
          ].map((s) => (
            <div key={s.l} className={`bg-white ${CLAY_SM} py-4`}>
              <div className="text-2xl font-extrabold">{s.n}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Enrollment CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className={`bg-slate-900 text-white ${CLAY} p-10 md:p-14`}>
          <h2 className="text-3xl md:text-4xl font-extrabold">Sẵn Sàng Vào Phòng Thi?</h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto">
            Sinh viên đăng nhập bằng MSSV, Giảng viên khởi tạo lớp học phần đầu tiên chỉ trong vài phút.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login/student"
              className={`w-full sm:w-auto bg-emerald-400 text-slate-900 ${CLAY_BTN} px-8 py-4 text-base font-extrabold flex items-center justify-center space-x-2`}
            >
              <UserCheck className="w-5 h-5" />
              <span>Đăng Nhập Sinh Viên</span>
            </Link>
            <Link
              href="/login/lecturer"
              className={`w-full sm:w-auto bg-white text-slate-900 ${CLAY_BTN} px-8 py-4 text-base font-extrabold flex items-center justify-center space-x-2`}
            >
              <GraduationCap className="w-5 h-5" />
              <span>Cổng Giảng Viên</span>
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400">Không cần cài đặt · Chạy ngay trên trình duyệt</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t-[3px] border-slate-900 bg-white py-8 text-center text-xs text-slate-600">
        © 2026 UniQuiz System — Tự động hoá quản lý điểm thi học phần Đại học.
      </footer>
    </main>
  );
}
