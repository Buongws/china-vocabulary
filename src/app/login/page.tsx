import Link from 'next/link';
import { Heart, BookOpen, Sparkles, ArrowUpRight } from 'lucide-react';
import { LoginForm } from '@/components/login-form';

export const metadata = { title: 'Đăng nhập' };
export default function LoginPage() {
  return <main className="login-page">
    <section className="login-story">
      <Link href="/login" className="brand"><span className="brand-mark">t<span>·</span></span><span>TNA<span className="brand-caption">VOCABULARY</span></span></Link>
      <div className="login-story-content"><span className="eyebrow"><Heart size={15} /> MỘT HÀNH TRÌNH, HAI NGƯỜI</span><h1>Mỗi ngày một chút.<br /><em>Cùng nhau</em> tiến bộ.</h1><p>Thêm một từ mới, thêm một điều để kể nhau nghe. Tiếng Trung và tiếng Anh, theo nhịp của riêng bạn.</p>
      <div className="login-word-cards"><div className="sample-card chinese"><span className="sample-top">TIẾNG TRUNG <span>01</span></span><strong lang="zh-CN">一起</strong><span className="pronunciation">yì qǐ</span><div className="sample-meaning">cùng nhau</div><span className="sample-example">我们一起学习。</span></div><div className="sample-card english"><span className="sample-top">TIẾNG ANH <span>02</span></span><strong>grow</strong><span className="pronunciation">/ɡrəʊ/</span><div className="sample-meaning">trưởng thành, phát triển</div><span className="sample-example">Let’s grow together.</span></div></div>
      <div className="login-features"><span><BookOpen size={17} /> Học theo nhịp riêng</span><span><Sparkles size={17} /> Nhớ lâu hơn mỗi ngày</span></div></div>
      <p className="login-footer">Những tiến bộ nhỏ, một hành trình dài.</p>
    </section>
    <section className="login-entry"><div className="login-entry-inner"><span className="login-welcome">CHÀO BẠN TRỞ LẠI</span><h2>Hôm nay mình<br />học gì nhỉ?</h2><p className="muted">Đăng nhập để tiếp tục hành trình của bạn.</p><LoginForm /><div className="setup-prompt"><span>Lần đầu thiết lập ứng dụng?</span><Link href="/setup">Xem hướng dẫn Supabase <ArrowUpRight size={15} /></Link></div></div><span className="login-copyright">TNA Vocabulary · Học cùng nhau, lớn cùng nhau</span></section>
  </main>;
}
