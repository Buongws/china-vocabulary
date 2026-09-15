import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Database, Download } from 'lucide-react';

export function SetupGuide({ reason }: { reason?: string }) {
  return <main className="setup-page"><Link href="/login" className="text-link"><ArrowLeft size={17} /> Về đăng nhập</Link><div className="setup-heading"><span className="large-icon"><Database /></span><p className="eyebrow">THIẾT LẬP BAN ĐẦU</p><h1>Sẵn sàng cho ngày học đầu tiên.</h1><p className="muted">Kết nối một lần. Sau đó, chỉ cần mở app và học cùng nhau.</p></div>
    {reason && <div className="notice">{reason}</div>}
    <div className="setup-steps">
      <section className="panel"><span className="step-number">01</span><h2>Tạo bảng và thêm bộ từ</h2><p>Mở SQL Editor của dự án Supabase. Tải file bên dưới, dán toàn bộ nội dung vào một truy vấn mới và chọn Run. File gồm cấu trúc database, quyền truy cập, bộ tiếng Anh, 40 bài HSK 6 tiếng Trung và trường ngôn ngữ ưu tiên cho onboarding.</p><div className="button-row"><a className="button primary" href="/setup.sql" download><Download size={17} /> Tải SQL thiết lập</a><a className="button outline" href="/experience-fix.sql" download><Download size={17} /> Cập nhật tiến trình học</a><a className="button outline" href="/hsk6-fix.sql" download><Download size={17} /> Sửa riêng HSK 6</a><a className="button outline" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Mở Supabase <ArrowUpRight size={16} /></a></div></section>
      <section className="panel"><span className="step-number">02</span><h2>Tạo hai tài khoản</h2><p>Vào Authentication → Users → Add user → Create new user. Nhập email, mật khẩu và chọn Auto Confirm User cho từng người. Giữ cài đặt Confirm email của dự án như hiện tại.</p><p className="form-note">Bạn có thể bắt đầu với một tài khoản và ghép đôi sau.</p></section>
      <section className="panel"><span className="step-number">03</span><h2>Bật nhắc học trong ứng dụng</h2><p>Chạy file nhắc học riêng để bật Supabase Cron. Thông báo được lưu trong ứng dụng ngay cả khi bạn chưa mở app.</p><a className="button outline" href="/reminders.sql" download><Download size={17} /> Tải SQL nhắc học</a></section>
      <section className="panel setup-done"><Check size={24} /><div><h2>Đăng nhập và mời người yêu</h2><p>Chọn bộ từ, đặt mục tiêu ngày và gửi mã mời cho người cùng học.</p></div><Link href="/login" className="button primary">Bắt đầu học</Link></section>
    </div><p className="form-note">Email xác nhận tự động và khôi phục mật khẩu sẽ được cấu hình qua Resend ở giai đoạn sau.</p></main>;
}
