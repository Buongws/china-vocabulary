# TNA Vocabulary

Ứng dụng học tiếng Trung giản thể và tiếng Anh dành cho hai người: học từ mới, ôn theo lịch SM-2, luyện viết, ghép đôi, streak và thống kê. Giao diện dùng tiếng Việt và hoạt động tốt trên điện thoại lẫn máy tính.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Thông tin Supabase của dự án hiện đã được điền trong `.env.local`; `.env.example` là mẫu an toàn để tham khảo.

## Thiết lập Supabase

1. Khi ứng dụng chạy, mở [http://localhost:3000/setup](http://localhost:3000/setup).
2. Tải `tna-vocabulary-setup.sql`, mở **SQL Editor** của Supabase, dán toàn bộ nội dung và chọn **Run**. File gồm migration, RLS, các hàm nghiệp vụ, bộ tiếng Anh có sẵn và bộ tiếng Trung HSK 6 theo 40 bài.
3. Phần `supabase/hsk6-chinese.sql` có thể chạy lại riêng sau migration. Phần này lưu trữ (archive) các deck tiếng Trung mặc định cũ, giữ nguyên dữ liệu học đã có, rồi bật 40 deck HSK 6 mới.
3. Tải và chạy `tna-vocabulary-reminders.sql` nếu muốn tạo thông báo nhắc học khi ứng dụng đang đóng.
4. Trong **Authentication → Users → Add user**, tạo hai tài khoản và chọn **Auto Confirm User**. Có thể dùng một tài khoản trước rồi ghép đôi sau.
5. Đăng nhập, đặt tên hiển thị, chọn bộ từ, rồi tạo mã mời trong “Góc của hai đứa”.

Chi tiết database và các RPC nằm tại [supabase/README.md](supabase/README.md). Email xác nhận tự phục vụ, khôi phục mật khẩu và email nhắc học chưa được bật; chúng sẽ dùng Resend khi có cấu hình gửi email.

## Kiểm tra chất lượng

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run vocabulary:check
npm run build
```

Dữ liệu tiếng Anh hiện có nằm trong `data/vocabulary-en.txt`. Nguồn và quy tắc chuẩn bị bộ tiếng Anh giao tiếp công việc/đời sống được ghi tại `docs/english-sources.md`. Dữ liệu HSK 6 được lưu trong `data/hsk6-vocabulary.json`; chạy `node scripts/generate-hsk6-seed.mjs` để tạo lại `supabase/hsk6-chinese.sql`.

Mẫu nhập bộ từ riêng nằm tại `public/import-template.csv`. Cột `accepted_answers` nhận nhiều đáp án, ngăn cách bằng ký tự `|`.
