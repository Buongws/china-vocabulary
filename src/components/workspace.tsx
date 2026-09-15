'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronRight, Flame, FolderOpen, Heart, House, LogOut, Menu, PenLine, RefreshCw, Settings, Sparkles, X, CheckCircle2, CircleAlert } from 'lucide-react';
import { mutate, refreshSnapshot, signOut } from '@/lib/actions';
import type { Language, Snapshot } from '@/lib/types';
import { LANGUAGES } from '@/lib/types';
import { formatDate, studyDate } from '@/lib/utils';
import { calculateStreak } from '@/lib/learning';
import { AppContext } from './app-context';
import { Dashboard } from './dashboard';
import { DecksPage } from './decks';
import { SettingsPage } from './settings';
import { CouplePage, StatsPage, NotificationsPage } from './social-stats';
import { StudyPage } from './study-page';
import { OnboardingLanguage } from './onboarding-language';
import { StudyHistoryPage } from './study-history';

const navigation = [
  { href: '/', key: 'dashboard', label: 'Hôm nay', icon: House },
  { href: '/learn', key: 'learn', label: 'Học từ mới', icon: Sparkles },
  { href: '/review', key: 'review', label: 'Ôn tập', icon: RefreshCw },
  { href: '/practice', key: 'practice', label: 'Luyện viết', icon: PenLine },
  { href: '/history', key: 'history', label: 'Lịch sử từ đã học', icon: FolderOpen },
  { href: '/decks', key: 'decks', label: 'Bộ từ vựng', icon: BookOpen },
  { href: '/couple', key: 'couple', label: 'Góc của hai đứa', icon: Heart },
  { href: '/stats', key: 'stats', label: 'Hành trình', icon: ChartNoAxesCombined },
];
const titles: Record<string, string> = { dashboard: 'Hôm nay', learn: 'Học từ mới', review: 'Ôn tập', practice: 'Luyện viết', history: 'Lịch sử từ đã học', decks: 'Bộ từ vựng', couple: 'Góc của hai đứa', stats: 'Hành trình', settings: 'Cài đặt', notifications: 'Thông báo' };

export function Workspace({ initialData, view, deckId, initialLanguage }: { initialData: Snapshot; view: string; deckId?: string; initialLanguage?: Language }) {
  const [data, setData] = useState(initialData);
  const preferred = initialData.profile.preferred_language || initialData.settings.find(item => item.enabled)?.language || 'zh';
  const [language, setLanguage] = useState<Language>(initialLanguage || preferred);
  const [pendingMethod, setPendingMethod] = useState<Parameters<typeof mutate>[0] | null>(null);
  const busy = pendingMethod !== null;
  const blocking = pendingMethod === 'import_words';
  const revisionRef = useRef(0);
  const pendingRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const today = studyDate();
  const streak = calculateStreak(data.completed_days);
  const unread = data.notifications.filter(item => !item.read_at).length;
  const sessionIds = new Set(data.sessions.filter(session => session.study_date === today).map(session => session.id));
  const reviews = data.items.filter(item => sessionIds.has(item.session_id) && item.kind === 'review' && !item.completed_at).length;

  const notify = useCallback((message: string, error = false) => { setToast({ message, error }); }, []);
  const run = useCallback(async (method: Parameters<typeof mutate>[0], params: Record<string, unknown> = {}, message?: string) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    revisionRef.current += 1;
    setPendingMethod(method);
    try {
      const response = await mutate(method, params);
      if (response.error) { notify(response.error, true); return false; }
      if (response.snapshot) {
        setData(response.snapshot);
        if ((method === 'set_preferred_language' || method === 'save_learning_settings') && response.snapshot.profile.preferred_language) setLanguage(response.snapshot.profile.preferred_language);
      }
      if (message) notify(message);
      return true;
    } catch { notify('Chưa lưu được thay đổi. Kiểm tra kết nối và thử lại nhé.', true); return false; }
    finally { revisionRef.current += 1; pendingRef.current = false; setPendingMethod(null); }
  }, [notify]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== 'visible' || pendingRef.current) return;
      const revision = revisionRef.current;
      try { const response = await refreshSnapshot(); if (response.snapshot && revision === revisionRef.current) setData(response.snapshot); } catch { /* Existing data remains visible until connection returns. */ }
    }
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60_000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, []);

  return <AppContext.Provider value={{ data, language, setLanguage, busy, pendingMethod, run, notify }}>
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <div className="app-shell" inert={blocking} aria-busy={blocking}>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <Link href="/" className="brand"><span className="brand-mark">t<span>·</span></span><span>TNA<span className="brand-caption">VOCABULARY</span></span></Link>
        <button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
        <p className="sidebar-label">KHÔNG GIAN HỌC TẬP</p>
        <nav aria-label="Điều hướng chính">{navigation.map(item => <Link key={item.key} href={['learn','review','practice','decks'].includes(item.key) ? `${item.href}?language=${language}` : item.href} onClick={() => setSidebarOpen(false)} className={`nav-item ${view === item.key ? 'active' : ''}`} aria-current={view === item.key ? 'page' : undefined}><item.icon size={19} /><span>{item.label}</span>{item.key === 'review' && reviews > 0 && <span className="nav-count">{reviews}</span>}</Link>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-note"><span><Heart size={16} /> Mỗi ngày một chút</span><p>Một từ mới cũng là<br />một bước tiến rồi.</p></div><Link href="/settings" className={`nav-item ${view === 'settings' ? 'active' : ''}`}><Settings size={19} /> Cài đặt</Link><div className="sidebar-user"><span className="avatar">{data.profile.display_name.charAt(0).toUpperCase() || 'B'}</span><div><strong>{data.profile.display_name || 'Bạn học'}</strong><span>Cùng nhau tiến bộ</span></div><form action={signOut}><button type="submit" className="icon-button" aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={17} /></button></form></div></div>
      </aside>
      <div className="app-body"><header className="topbar"><div className="topbar-path"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Mở menu"><Menu size={22} /></button><span>Không gian của bạn</span><ChevronRight size={14} /><strong>{titles[view]}</strong></div><div className="topbar-actions"><span className="today-date"><CalendarDays size={15} />{formatDate(today, { weekday: 'short', day: 'numeric', month: 'numeric' })}</span><span className="streak-pill"><Flame size={17} />{streak}<span>ngày</span></span><Link className="icon-button notification-button" href="/notifications" aria-label={`Thông báo, ${unread} chưa đọc`}><Bell size={20} />{unread > 0 && <i />}</Link></div></header>
      <main id="main-content" className={`main-content ${['learn','review','practice'].includes(view) ? 'study-main' : ''}`}>
        {view === 'dashboard' && <Dashboard />}
        {['learn','review','practice'].includes(view) && <StudyPage mode={view as 'learn' | 'review' | 'practice'} />}
        {view === 'history' && <StudyHistoryPage />}
        {view === 'decks' && <DecksPage deckId={deckId} />}
        {view === 'settings' && <SettingsPage />}
        {view === 'couple' && <CouplePage />}
        {view === 'stats' && <StatsPage />}
        {view === 'notifications' && <NotificationsPage />}
      </main><footer className="app-footer"><span>TNA Vocabulary</span><span>Học theo nhịp của bạn <Heart size={12} /></span></footer></div>
    </div>
    {!data.profile.preferred_language && <OnboardingLanguage />}
    {blocking && <div className="saving-overlay" role="status" aria-live="polite"><div className="saving-card"><RefreshCw className="spin" size={24} aria-hidden="true" /><strong>Đang xử lý…</strong><span>Vui lòng chờ một chút nhé.</span></div></div>}
    {toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}<span>{toast.message}</span><button className="icon-button" onClick={() => setToast(null)} aria-label="Đóng thông báo"><X size={16} /></button></div>}
  </AppContext.Provider>;
}

export function LanguageTabs() {
  const { data, language, setLanguage, busy } = useAppContextForTabs();
  const order = data.profile.preferred_language ? ([data.profile.preferred_language, data.profile.preferred_language === 'zh' ? 'en' : 'zh'] as const) : (['zh','en'] as const);
  return <div className="language-tabs" role="group" aria-label="Chọn ngôn ngữ">{order.map(code => <button type="button" disabled={busy} key={code} aria-pressed={language === code} className={language === code ? 'selected' : ''} onClick={() => setLanguage(code)}><span className={`language-symbol ${LANGUAGES[code].className}`}>{LANGUAGES[code].symbol}</span>{LANGUAGES[code].label}</button>)}</div>;
}

import { useApp as useAppContextForTabs } from './app-context';
