'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, Flame, Heart, PenLine, RefreshCw, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useApp } from './app-context';
import { LANGUAGES } from '@/lib/types';
import { calculateStreak } from '@/lib/learning';
import { studyDate, formatDate } from '@/lib/utils';

export function Dashboard() {
  const { data, language, run, busy, pendingMethod } = useApp();
  const today = studyDate();
  const todays = data.sessions.filter(session => session.study_date === today);
  const ids = new Set(todays.map(session => session.id));
  const items = data.items.filter(item => ids.has(item.session_id));
  const done = items.filter(item => item.completed_at).length;
  const percentage = items.length ? Math.round(done / items.length * 100) : 0;
  const completedToday = data.completed_days.includes(today);
  const activeSettings = data.settings.filter(item => item.enabled).sort((a,b) => Number(b.language === data.profile.preferred_language) - Number(a.language === data.profile.preferred_language));
  const streak = calculateStreak(data.completed_days);
  const due = data.progress.filter(item => item.next_review_date <= today).length;
  const coupleStreak = calculateStreak(data.couple?.completed_days || []);
  const firstName = data.profile.display_name.trim().split(/\s+/).at(-1) || 'bạn';
  const week = Array.from({length:7}, (_, index) => { const date = new Date(`${today}T12:00:00+07:00`); date.setUTCDate(date.getUTCDate() - (6-index)); return studyDate(date); });

  return <>
    <section className="page-heading"><div><p className="eyebrow">MỖI NGÀY, MỘT BƯỚC NHỎ</p><h1>Chào {firstName}, <span className="heading-accent">mình học nhé.</span></h1><p className="muted">{completedToday ? 'Bạn đã hoàn thành hôm nay. Một ngày thật đáng tự hào!' : 'Dành một chút thời gian cho điều tốt đẹp hôm nay.'}</p></div><Link href="/stats" className="button outline"><TrendingUp size={17} /> Hành trình của bạn</Link></section>
    <div className="dashboard-grid"><div className="dashboard-primary">
      <section className="today-panel panel"><div className="section-top"><div className="icon-heading"><span className="icon-tile rose"><Target size={21} /></span><div><h2>Mục tiêu hôm nay</h2><p>{formatDate(today, { weekday:'long',day:'numeric',month:'long' })}</p></div></div><span className={`badge ${completedToday ? 'mint' : 'rose'}`}>{completedToday ? <><Check size={13} /> Hoàn thành</> : 'Từng chút một'}</span></div><div className="today-progress"><div><strong>{done}<span> / {items.length || activeSettings.reduce((total,item) => total + item.daily_target,0)}</span></strong><p>bài đã hoàn thành</p></div><div className="progress-ring" style={{ '--progress': `${percentage}%` } as React.CSSProperties}><span>{percentage}<small>%</small></span></div></div><div className="progress-track"><div style={{width:`${percentage}%`}} /></div><div className="today-progress-footer"><span>{todays.length ? 'Tiến độ được lưu sau mỗi bài' : 'Bắt đầu để chốt bài học hôm nay'}</span><span><Flame size={14} />{streak} ngày liên tục</span></div></section>
      <div className="section-title"><h2>Lộ trình của bạn</h2><Link href="/settings" className="text-link">Điều chỉnh <ArrowUpRight size={15} /></Link></div>
      <div className="track-grid">{activeSettings.map(settings => {
        const lang = LANGUAGES[settings.language];
        const session = todays.find(item => item.language === settings.language);
        const sessionItems = items.filter(item => item.session_id === session?.id);
        const reviewItems = sessionItems.filter(item => item.kind !== 'new');
        const newItems = sessionItems.filter(item => item.kind === 'new');
        const reviewsLeft = session ? reviewItems.filter(item => !item.completed_at).length : data.progress.filter(item => item.language === settings.language && item.next_review_date <= today).length;
        const newDone = newItems.filter(item => item.completed_at).length;
        const target = session ? newItems.length : settings.daily_target;
        return <section className={`track-card ${lang.className}`} key={settings.language}><div className="track-card-top"><span className="track-symbol">{lang.symbol}</span><span className="badge">HỌC MỖI NGÀY</span></div><h3>{lang.label}</h3><p>{data.progress.filter(item => item.language === settings.language).length} từ đã làm quen</p><div className="track-counts"><div><RefreshCw size={16} /><span>Cần ôn</span><strong>{reviewsLeft}<small> từ</small></strong></div><div><Sparkles size={16} /><span>Từ mới</span><strong>{newDone}<small> / {target}</small></strong></div></div><Link className="button track-button" href={reviewsLeft ? `/review?language=${settings.language}` : `/learn?language=${settings.language}`}>{session?.completed_at ? 'Ôn thêm một chút' : reviewsLeft ? 'Ôn tập trước nhé' : 'Bắt đầu học'}<ArrowRight size={17} /></Link></section>;
      })}</div>
      {!activeSettings.length && <section className="panel empty-state"><BookOpen /><h3>Chọn lộ trình đầu tiên</h3><p>Bật tiếng Trung, tiếng Anh hoặc cả hai trong cài đặt.</p><Link href="/settings" className="button primary">Chọn ngôn ngữ</Link></section>}
      <section className="practice-banner"><span className="icon-tile paper"><PenLine size={24} /></span><div><h3>Để bàn tay giúp bạn ghi nhớ.</h3><p>Luyện nét chữ Hán hoặc thử một bài chính tả tiếng Anh.</p></div><Link href={`/practice?language=${language}`} className="button outline">Luyện viết <ArrowUpRight size={16} /></Link></section>
      <section className="weekly-panel panel"><div className="section-top"><div><h2>Nhịp học tuần này</h2><p className="muted">Mỗi dấu tích là một lần bạn dành thời gian cho mình.</p></div><span className="badge mint">{week.filter(date => data.completed_days.includes(date)).length}/7 ngày</span></div><div className="week-days">{week.map(date => <div key={date} className={`${data.completed_days.includes(date) ? 'completed' : ''} ${date === today ? 'current' : ''}`}><span>{formatDate(date,{weekday:'short'})}</span><div>{data.completed_days.includes(date) ? <Check size={22} /> : date === today ? <span className="today-dot" /> : <span>·</span>}</div><small>{formatDate(date,{day:'numeric',month:'numeric'})}</small></div>)}</div></section>
    </div><aside className="dashboard-secondary">
      <section className="couple-card panel"><div className="section-top"><span className="eyebrow"><Heart size={14} /> GÓC CỦA HAI ĐỨA</span><Link className="icon-button" href="/couple" aria-label="Mở góc của hai đứa"><ArrowUpRight size={18} /></Link></div><div className="couple-avatars"><span className="avatar large">{data.profile.display_name.charAt(0) || 'B'}</span><span className="couple-heart"><Heart size={18} fill="currentColor" /></span><span className={`avatar large partner ${data.partner ? '' : 'empty-avatar'}`}>{data.partner?.display_name.charAt(0) || '?'}</span></div><h3>{data.partner ? `Có ${data.partner.display_name} cùng học` : 'Thêm một người, thêm động lực.'}</h3><p>{data.partner ? data.partner.completed_today ? 'Người ấy đã hoàn thành mục tiêu hôm nay rồi!' : 'Hai đứa cùng hoàn thành mục tiêu hôm nay nhé.' : 'Mời người yêu để cùng học, nhắc nhau và giữ một streak chung.'}</p>{data.partner ? <><div className="partner-status"><span><span className={`status-indicator ${data.partner.completed_today ? 'done' : ''}`} />{data.partner.display_name}</span><strong>{data.partner.completed_today ? 'Đã học xong' : 'Đang chờ hôm nay'}</strong></div><button className="button outline full-width" disabled={busy} onClick={() => run('encourage_partner',{},'Đã gửi một trái tim cổ vũ!')}><Heart size={17} className={pendingMethod === 'encourage_partner' ? 'pulse' : undefined} /> {pendingMethod === 'encourage_partner' ? 'Đang gửi…' : 'Gửi một chút động lực'}</button></> : <Link href="/couple" className="button primary full-width">Kết nối cùng nhau <ArrowRight size={17} /></Link>}<div className="couple-streak"><Flame size={19} /><strong>{coupleStreak}</strong><span>ngày cùng nhau</span></div></section>
      <section className="mini-stats panel"><div><span className="icon-tile mint"><BookOpen size={20} /></span><div><strong>{data.progress.length}</strong><span>từ đã làm quen</span></div></div><div><span className="icon-tile gold"><CheckCheck size={20} /></span><div><strong>{data.progress.filter(item => item.interval_days >= 21).length}</strong><span>từ đang nhớ vững</span></div></div><div><span className="icon-tile rose"><RefreshCw size={20} /></span><div><strong>{due}</strong><span>từ đến lịch ôn</span></div></div></section>
      <section className="quiet-note"><span>GHI CHÚ NHỎ</span><blockquote>“Không cần nhớ hết hôm nay.<br />Chỉ cần quay lại vào ngày mai.”</blockquote><span className="note-line" /></section>
    </aside></div>
  </>;
}
