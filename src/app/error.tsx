'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page"><span className="brand-mark">t<span>·</span></span><h1>Có một chút gián đoạn.</h1><p>Chưa tải được dữ liệu. Bạn thử lại sau khi kiểm tra kết nối nhé.</p><div className="button-row"><button className="button primary" onClick={reset}>Thử lại</button><Link href="/login" className="button outline">Đăng nhập lại</Link><Link href="/setup" className="text-link">Hướng dẫn thiết lập</Link></div></main>;
}
