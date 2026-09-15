# Bộ tiếng Trung HSK 6

`supabase/hsk6-chinese.sql` thay thế các deck tiếng Trung mặc định bằng 40 deck theo đúng 40 bài của **HSK 标准教程 6** (20 bài mỗi tập). Dữ liệu chữ Hán, pinyin và nghĩa tiếng Việt được lấy theo bảng `生词` trong bốn bản PDF người dùng cung cấp.

SQL này không xóa các bản ghi lịch sử. Nó đặt `archived = true` cho deck/từ tiếng Trung mặc định, rồi bật lại 40 deck HSK 6. Deck tiếng Trung do người dùng tự tạo không bị ảnh hưởng.

Kiểm tra tại thời điểm tạo file:

- 40 deck, 1.957 mục từ, không trùng trong cùng một bài.
- Câu ví dụ chỉ được điền khi tìm thấy nguyên văn trong phần bài khóa đã OCR; mục không có câu khớp được để trống thay vì tự viết câu mới.
- 433 mục hiện có câu ví dụ đã lọc sạch nhiễu; 1.524 mục chưa có câu ví dụ xác nhận được. Vì yêu cầu không được bịa dữ liệu, các mục này cần đối chiếu thủ công với trang bài khóa tương ứng trước khi dùng làm bài luyện câu.

Chạy `node scripts/generate-hsk6-seed.mjs` để tạo lại SQL sau khi chỉnh `data/hsk6-vocabulary.json`. Trước khi chạy trên dữ liệu thật, nên mở nhanh SQL và kiểm tra số liệu sau import:

```sql
select count(*) from public.decks where language = 'zh' and not archived;
select count(*) from public.words where language = 'zh' and not archived;
select count(*) from public.words where language = 'zh' and not archived and example_sentence = '';
```
