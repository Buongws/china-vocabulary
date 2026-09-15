# Nguồn dữ liệu tiếng Anh cho TNA Vocabulary

## Phạm vi bộ dữ liệu

Bộ tiếng Anh sẽ tập trung vào giao tiếp công việc và đời sống hằng ngày, chia thành 10 bộ chủ đề, mỗi bộ khoảng 30 mục. Mỗi mục trong SQL cần có:

- từ hoặc cụm từ tiếng Anh;
- phiên âm tiếng Anh-Mỹ (IPA/phoneme đã kiểm tra);
- nghĩa tiếng Việt do biên soạn cho đúng ngữ cảnh;
- câu ví dụ tiếng Anh và bản dịch tiếng Việt;
- ghi chú nguồn để có thể kiểm tra hoặc thay thế về sau.

## Nguồn được chọn

### Tatoeba

Dùng cho câu ví dụ và câu dịch. Tatoeba cung cấp bản tải dữ liệu câu theo ngôn ngữ; phần lớn dữ liệu tải xuống được phát hành theo CC BY 2.0 FR, một phần theo CC0 1.0. Khi đưa câu vào ứng dụng, cần giữ thông tin ghi công và không xem mọi câu là nội dung đã được biên tập sư phạm.

- Trang tải chính thức: https://tatoeba.org/en/downloads
- FAQ về quyền sử dụng: https://en.wiki.tatoeba.org/articles/show/faq

### Princeton WordNet

Dùng để đối chiếu từ loại, các nghĩa và gloss tiếng Anh. WordNet cho phép sử dụng, sửa đổi và phân phối theo điều kiện giấy phép của Princeton; bản phân phối phải giữ thông báo bản quyền và trích dẫn nguồn.

- Giấy phép: https://wordnet.princeton.edu/license-and-commercial-use
- Hướng dẫn trích dẫn: https://wordnet.princeton.edu/citing-wordnet

### CMU Pronouncing Dictionary

Dùng để kiểm tra phát âm tiếng Anh-Mỹ. CMUdict là từ điển phát âm do Carnegie Mellon duy trì; họ cho phép sử dụng cho mục đích nghiên cứu và thương mại, đồng thời yêu cầu ghi nhận nguồn. CMU cũng công khai rằng từ điển có thể còn lỗi, vì vậy phiên âm phải được kiểm tra theo từng mục trước khi nhập.

- Kho chính thức: https://github.com/cmusphinx/cmudict

## Quy tắc biên soạn SQL

1. Không chép nguyên một giáo trình thương mại hoặc danh sách có bản quyền.
2. Chỉ chọn câu Tatoeba ngắn, tự nhiên, không chứa tên riêng nhạy cảm, lỗi OCR hoặc ngữ cảnh khó hiểu.
3. Không dùng một câu làm ví dụ cho nhiều nghĩa khác nhau nếu câu đó không thể hiện đúng nghĩa đang dạy.
4. Cụm động từ và mẫu giao tiếp được lưu như một mục riêng; không tách máy móc thành từng từ đơn.
5. Các mục không có phát âm CMU rõ ràng phải được đánh dấu để kiểm tra thủ công, không tự đoán IPA.
6. SQL phải có phần ghi công nguồn và có thể chạy lại nhiều lần mà không tạo bản ghi trùng.

## Giới hạn cần nói rõ

Không có một nguồn mở duy nhất vừa cung cấp danh sách “giao tiếp công việc + đời sống”, nghĩa tiếng Việt, ví dụ tốt và phiên âm chính xác tuyệt đối. Vì vậy bộ import phải là dữ liệu kết hợp: chủ đề được biên soạn có kiểm soát, WordNet dùng để đối chiếu nghĩa, Tatoeba dùng cho ví dụ, và CMUdict dùng để kiểm tra phát âm. Các mục vẫn cần một vòng rà soát người dùng trước khi coi là bộ chính thức.
