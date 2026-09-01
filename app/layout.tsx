import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ Thống Quiz & Quản Lý Điểm Học Phần",
  description: "Ứng dụng kiểm tra trực tuyến, tự động hóa chấm điểm và quản lý danh sách lớp học cho Giảng viên & Sinh viên Đại học.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
