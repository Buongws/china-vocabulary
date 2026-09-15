# Cấu hình Supabase cho TNA Vocabulary

## Thiết lập lần đầu

1. Tạo project Supabase. Trong **Project Settings → API**, sao chép Project URL và publishable key vào `.env.local` theo `.env.example` ở thư mục dự án. Chỉ dùng khóa công khai trong biến `NEXT_PUBLIC_…`; ứng dụng không cần service-role key, JWT signing secret hoặc mật khẩu database.
2. Trong **SQL Editor**, chạy toàn bộ `migrations/202609140001_initial.sql` **một lần**. File nằm trong transaction nên khi lỗi, thay đổi chưa hoàn tất sẽ được rollback.
3. Chạy `seed.sql` để nhập 20 bộ chủ đề với 300 từ tiếng Anh và 300 từ tiếng Trung. Có thể tạo lại file seed từ dữ liệu nguồn bằng lệnh được ghi trong README chính.
4. Trong **Authentication → Providers → Email**, giữ xác nhận email. Trong **Authentication → Users → Add user**, tạo hai tài khoản với mật khẩu đủ mạnh và bật **Auto Confirm User** cho mỗi tài khoản. Hồ sơ và hai cài đặt ngôn ngữ được tạo tự động; tài khoản có trước migration cũng được khởi tạo.
5. Trong **Authentication → URL Configuration**, đặt Site URL `http://localhost:3000` khi chạy local. Khi chuyển sang một tên miền khác, cập nhật Site URL và các redirect URL tương ứng.
6. Chạy riêng `enable-cron.sql` để bật nhắc học. Nếu project chưa bật Cron, script đưa ra thông báo hướng dẫn; bật **Integrations → Cron** trong Supabase rồi chạy lại. Kiểm tra công việc `tna-vocabulary-reminders` trong trang Cron. App vẫn dùng được khi Cron chưa cấu hình, nhưng sẽ chưa có thông báo nhắc tự động.
7. Khởi động ứng dụng, đăng nhập mỗi tài khoản trên hai trình duyệt khác nhau, tạo mã mời ở tài khoản thứ nhất rồi nhập mã ở tài khoản thứ hai.

Các file SQL không chứa thông tin đăng nhập. Không cần tắt RLS. Không mở đăng ký tự phục vụ hoặc khôi phục mật khẩu trong bản này; việc đổi mật khẩu sử dụng phiên đã đăng nhập qua Supabase Auth. Chỉ bật luồng email sau khi cấu hình nhà cung cấp email.

## RPC và quyền truy cập

Các RPC công khai yêu cầu Supabase JWT hợp lệ và luôn lấy tài khoản từ `auth.uid()`. Client không được ghi trực tiếp tiến độ, phiên học, ngày hoàn thành hoặc cặp đôi. Mọi bảng đều bật RLS; truy vấn trực tiếp chỉ có quyền đọc các dòng được phép. Những hàm nội bộ trong `tna_private` không có quyền gọi từ client, ngoại trừ hàm kiểm tra truy cập bộ từ dùng trong RLS.

| RPC | Kết quả / hành vi |
| --- | --- |
| `get_app_data()` | Hồ sơ, cài đặt, bộ từ/từ có quyền đọc, tiến độ và lịch sử cá nhân, thông báo, tóm tắt người yêu. Áp dụng cài đặt đến hạn và xử lý bài không còn truy cập được. |
| `start_daily_sessions()` | Chốt cả hai lộ trình đang bật cho ngày UTC+7; gọi lại tiếp tục cùng phiên. Trả về cùng cấu trúc với `get_app_data()`. |
| `submit_answer(p_item_id, p_attempt_id, p_rating, p_answer, p_mode, p_writing_correct)` | Trả `{is_correct, progress, day_completed}`. Mã lần gửi UUID chống gửi lặp; một bài chỉ thay đổi SRS một lần. |
| `practice_word(p_word_id, p_attempt_id, p_answer, p_mode, p_writing_correct)` | Cùng cấu trúc kết quả. Trả lời đúng không kéo dài lịch ôn; sai chỉ giảm lịch tối đa một lần mỗi từ/ngày. Từ chưa học không được tính đã học chỉ nhờ luyện tự do. |
| `save_settings(p_display_name, p_reminder_time, p_reminders_enabled, p_languages)` | Trả `{effective_date}`. Mảng ngôn ngữ phải có đúng `en` và `zh`, ít nhất một ngôn ngữ bật. |
| `create_invite()` | `{invite_code, invite_expires_at}`; trả lại mã còn hiệu lực nếu có. |
| `join_couple(p_code)` | `{id}` là UUID cặp. Mã dùng một lần, hết hạn sau 7 ngày. |
| `leave_couple()` | `{success:true}`; xóa liên kết, giữ lịch sử cá nhân. |
| `encourage_partner()` | `{sent}`; tối đa một trái tim/người gửi/ngày. |
| `save_deck(p_id, p_language, p_name, p_description)` | Tạo khi `p_id=null`, sửa khi có ID; trả toàn bộ dòng bộ từ. |
| `save_word(p_id, p_deck_id, p_word)` | Tạo/sửa từ và trả dòng từ. `p_word` gồm term, pronunciation, meaning, example_sentence, example_translation, accepted_answers. |
| `archive_deck(p_deck_id)` / `archive_word(p_word_id)` | `{success:true}`; lưu trữ và giữ lịch sử. |
| `import_words(p_deck_id, p_words)` | `{imported}`; nhập 1–1.000 từ trong một transaction, một dòng sai sẽ rollback toàn bộ. |
| `mark_notifications_read()` | `{success:true}`. |

`p_rating` là `forgot | hard | good | easy`; `p_mode` là `hanzi | dictation | cloze | meaning`. Database chấm tiếng Anh bằng từ chính hoặc `accepted_answers` sau khi chuẩn hóa chữ thường và khoảng trắng. Hanzi Writer chấm nét ở trình duyệt; `p_writing_correct` là kết quả lần viết đầu tiên. Đây là ứng dụng tự học, không phải hệ thống thi có giám sát: người sử dụng có thể tự báo sai kết quả chấm nét nếu cố tình gọi API thủ công.

`get_app_data().couple` có thể là `null`, đối tượng mã mời `{invite_code, invite_expires_at}` khi chưa ghép, hoặc cặp thật `{id, created_at, completed_days}`. Thông tin người yêu chỉ gồm tên hiển thị, số từ đã học, streak và đã hoàn thành hôm nay hay chưa. Chi tiết câu trả lời, email, giờ nhắc và cài đặt cá nhân của người kia không được chia sẻ. Các mảng luôn trả `[]` khi trống.

## Quy tắc dữ liệu

- Ngày học dùng `Asia/Ho_Chi_Minh` (UTC+7), độc lập múi giờ thiết bị. Gửi bài của ngày đã kết thúc bị từ chối; mở bài hôm nay để tiếp tục ôn từ chưa hoàn thành.
- Ôn đến hạn trước, rồi từ mới. Danh sách cả hai ngôn ngữ đóng băng khi lần đầu bắt đầu học trong ngày. Mục tiêu giảm theo số từ mới còn lại; nếu hết bài nhưng có từ đã học, nhận một bài ôn duy trì.
- Cấu hình mục tiêu, ngôn ngữ và bộ từ có hiệu lực ngay khi chưa bắt đầu bài hôm nay. Sau khi bắt đầu, các trường `pending_enabled`, `pending_daily_target`, `pending_deck_ids` có `effective_date` là ngày kế tiếp. Tên và giờ nhắc cập nhật ngay.
- `deck_ids=[]` nghĩa là tất cả bộ từ khả dụng của ngôn ngữ. Một lộ trình hoàn toàn không có từ khả dụng có phiên rỗng, không chặn hoàn thành lộ trình còn lại; giao diện hướng dẫn chọn hoặc tạo thêm bộ từ.
- Từ bị lưu trữ hoặc thuộc người yêu cũ được đánh dấu `session_items.skipped=true` khi đồng bộ, không làm mắc kẹt mục tiêu ngày. Các bài bị bỏ qua không sinh lần trả lời hoặc tăng số từ đã học.
- SM-2 dùng ease mới đã điều chỉnh để tính khoảng từ lần nhớ thứ ba, làm tròn số ngày; ease tối thiểu 1.3. Từ sai luôn ôn ngày mai. Luyện tự do sai không đẩy một từ vốn đã quá hạn ra xa hơn.
- Ngày hoàn thành được giữ nguyên sau khi đạt. Streak cá nhân giữ đến hết hôm nay nếu hôm qua hoàn thành. Streak chung lấy giao hai lịch hoàn thành, chỉ từ ngày ghép đôi hiện tại.
- Khóa transaction theo tài khoản chống hai thiết bị tạo phiên hoặc nộp bài trùng. Ghép/rời cặp dùng khóa chung cùng khóa duy nhất theo tài khoản để tránh tranh chấp người thứ ba. Bản ghi mã lần gửi lưu phản hồi gốc để retry khi mạng gián đoạn.
- Thông báo nhắc được Cron tạo mỗi phút sau giờ nhắc đã chọn, một lần/ngày và bỏ qua người đã hoàn thành. Job chạy trong database khi ứng dụng đóng; người học đọc thông báo khi mở app. Không có email hoặc push của hệ điều hành.

## Kiểm thử

Chạy `node supabase/tests/run-db.mjs` tại thư mục dự án. Bộ kiểm thử dùng PostgreSQL qua PGlite và mô phỏng phần `auth.users`/`auth.uid()` của Supabase, thực thi migration thật và các RPC thật. Kiểm tra SRS, gửi lặp, phiên học, cài đặt chờ, bài duy trì, kiểm tra quyền bằng vai trò `anon`/`authenticated`, ghép đôi, thu hồi chia sẻ, nhập atomic, streak và nhắc học. Nếu có `seed.sql`, runner kiểm tra thêm đúng 300 mục/ngôn ngữ.

Có thể chạy `tests/behavior.sql` trong SQL Editor với quyền postgres trên project thử nghiệm sau migration; tất cả fixture được rollback. Test tự động không thay thế kiểm tra Supabase Auth/JWT thật, cookie SSR, refresh phiên, Cron đang chạy trên cloud, hoặc tranh chấp đồng thời nhiều kết nối. Nghiệm thu các phần này bằng hai tài khoản thật sau khi cấu hình project. Không chạy script thử nghiệm bằng vai trò người học.

Tài liệu nền tảng: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Cron](https://supabase.com/docs/guides/cron).
