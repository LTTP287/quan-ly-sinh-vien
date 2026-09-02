# UniQuiz System — Hệ thống thi trắc nghiệm & quản lý điểm học phần

Next.js 14 (App Router) + TypeScript + TailwindCSS + Supabase.

## Hai chế độ chạy

| | Chế độ **demo** | Chế độ **Supabase** |
|---|---|---|
| Kích hoạt khi | chưa có `.env.local` | có `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Lưu trữ | `localStorage` từng máy | PostgreSQL dùng chung |
| Đăng nhập | không kiểm tra mật khẩu | Supabase Auth |
| Đáp án đúng | nằm trong bundle client | chỉ nằm trên server |
| Chấm điểm | trên trình duyệt | RPC `submit_exam()` trên server |
| Mã PIN | so sánh ở client | so sánh trong `verify_exam_access()` |
| Bảo vệ route | không có | middleware + RLS |

Chế độ demo chỉ để chạy thử giao diện. **Không dùng để thi thật.**

## Chạy nhanh (chế độ demo)

```bash
npm install
npm run dev
```

Mở http://localhost:3000 — đăng nhập sinh viên bằng MSSV `20120001`, mã PIN phòng thi `LOG888`.

## Thiết lập Supabase

1. Tạo project tại https://supabase.com.
2. Vào **SQL Editor**, chạy lần lượt:
   - `supabase/schema.sql` — bảng, index, trigger, RLS
   - `supabase/functions.sql` — các RPC của phòng thi
3. Copy `.env.example` thành `.env.local` rồi điền:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings > API > `service_role`) — **chỉ dùng ở server**
4. Tạo tài khoản Giảng viên: **Authentication > Users > Add user**, bật *Auto Confirm*.
   Sau đó chạy trong SQL Editor:

   ```sql
   update public.users
   set role = 'lecturer', full_name = 'TS. Nguyễn Văn A'
   where email = 'giangvien@edu.vn';
   ```

5. `npm run dev` và đăng nhập tại `/login/lecturer`.

Tài khoản sinh viên **không tạo tay**: giảng viên vào lớp → *Quản lý lớp & Import Excel*,
hệ thống tự tạo tài khoản (`<MSSV>@<NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN>`, mật khẩu
`DEFAULT_STUDENT_PASSWORD`) và ghi danh vào lớp.

## Mô hình bảo mật (chế độ Supabase)

- **RLS bật trên tất cả 9 bảng.** Giảng viên chỉ thấy lớp/đề của mình; sinh viên chỉ
  thấy lớp đã ghi danh và đề đã được publish + giao cho lớp đó.
- **Sinh viên không có quyền `SELECT` trên `questions` / `question_options`.** Đề thi
  chỉ đến được sinh viên qua RPC `get_exam_paper()`, hàm này bỏ hẳn cột `is_correct`.
- **Sinh viên không có quyền ghi bảng `submissions`.** Điểm chỉ được ghi bởi
  `submit_exam()` (SECURITY DEFINER), chấm trên đúng bộ câu hỏi mà server đã rút.
- **Mã PIN** nằm ở `quiz_classes.access_code`, đối chiếu trong `verify_exam_access()`.
- **Số lần chuyển tab** ghi ngay vào DB qua `record_violation()`, chỉ tăng không giảm —
  tải lại trang không reset được.
- **Điểm chỉ trả về client khi `quizzes.show_results = true`**, kể cả khi sinh viên
  tự sửa query string trên URL trang kết quả.
- Middleware chặn `/lecturer/*` và `/student/*` khi chưa đăng nhập, và chặn nhầm vai trò.

## Cấu trúc

```
app/
  api/students/import/   Route Handler tạo tài khoản SV (service-role)
  lecturer/              dashboard, lớp, test bank, thống kê điểm
  student/               dashboard, phòng thi, kết quả
lib/
  data/index.ts          tầng dữ liệu dùng chung (demo ⇄ Supabase)
  supabase/              client / server / config
  classStore.ts          backend localStorage cho chế độ demo
  grading.ts             chấm điểm phía client (chỉ dùng ở chế độ demo)
supabase/
  schema.sql             bảng + RLS
  functions.sql          RPC phòng thi
middleware.ts            bảo vệ route + refresh session
```

## Định dạng import

**Danh sách sinh viên** (`.xlsx`): cột `Mã sinh viên`, `Họ và tên`, `Email` (tùy chọn).

**Ngân hàng câu hỏi** (`.xlsx`): `Nội dung câu hỏi`, `Đáp án A..D`, `Đáp án đúng`.

**Dán text**: đánh dấu đáp án đúng bằng `*` **ở đầu dòng** (`*A. ...`). Dấu `*` nằm
giữa nội dung (ví dụ công thức `a * b`) không bị hiểu là đánh dấu.
