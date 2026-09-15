'use client';
import { BookOpen, Check, Sparkles } from 'lucide-react';
import { useApp } from './app-context';

export function OnboardingLanguage() {
  const { run, busy } = useApp();
  return <div className="onboarding-backdrop"><section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <span className="onboarding-icon"><Sparkles size={22} /></span>
    <p className="eyebrow">BẮT ĐẦU HÀNH TRÌNH</p><h1 id="onboarding-title">Bạn muốn học ngôn ngữ nào?</h1><p className="muted">Mình sẽ ưu tiên ngôn ngữ này trên trang chính và chuẩn bị bài học phù hợp cho bạn.</p>
    <button type="button" className="onboarding-language selected" onClick={() => void run('set_preferred_language',{p_language:'zh'},'Đã chọn lộ trình tiếng Trung.')} disabled={busy}>
      <span className="language-symbol chinese">中</span><span><strong>Tiếng Trung</strong><small>HSK 6 · Từ vựng, pinyin và luyện viết</small></span><Check size={20} />
    </button>
    <div className="onboarding-note"><BookOpen size={16} /> Bạn có thể bật thêm tiếng Anh bất cứ lúc nào trong Cài đặt.</div>
  </section></div>;
}
