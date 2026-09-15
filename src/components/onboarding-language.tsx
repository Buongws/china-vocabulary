'use client';
import { BookOpen, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useApp } from './app-context';
import type { Language } from '@/lib/types';

export function OnboardingLanguage() {
  const { run, busy } = useApp();
  const [selected, setSelected] = useState<Language>('zh');
  async function choose() {
    await run('set_preferred_language',{p_language:selected},`Đã chọn lộ trình ${selected === 'zh' ? 'tiếng Trung' : 'tiếng Anh'}.`);
  }
  return <div className="onboarding-backdrop"><section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <span className="onboarding-icon"><Sparkles size={22} /></span>
    <p className="eyebrow">BẮT ĐẦU HÀNH TRÌNH</p><h1 id="onboarding-title">Bạn muốn học ngôn ngữ nào?</h1><p className="muted">Mình sẽ ưu tiên ngôn ngữ này trên trang chính và chuẩn bị bài học phù hợp cho bạn.</p>
    <button type="button" className={`onboarding-language ${selected === 'zh' ? 'selected' : ''}`} onClick={() => setSelected('zh')} aria-pressed={selected === 'zh'} disabled={busy}>
      <span className="language-symbol chinese">中</span><span><strong>Tiếng Trung</strong><small>HSK 6 · Từ vựng, pinyin và luyện viết</small></span><Check size={20} />
    </button>
    <button type="button" className={`onboarding-language ${selected === 'en' ? 'selected' : ''}`} onClick={() => setSelected('en')} aria-pressed={selected === 'en'} disabled={busy}>
      <span className="language-symbol english">Aa</span><span><strong>Tiếng Anh</strong><small>Giao tiếp công việc và đời sống hằng ngày</small></span><Check size={20} />
    </button>
    <button type="button" className="button primary onboarding-submit" onClick={() => void choose()} disabled={busy}><BookOpen size={17} />{busy ? 'Đang lưu…' : 'Bắt đầu học'}</button>
    <div className="onboarding-note">Bạn có thể bật thêm ngôn ngữ còn lại trong Cài đặt.</div>
  </section></div>;
}
