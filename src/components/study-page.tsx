'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Search, Sparkles } from 'lucide-react';
import { useApp } from './app-context';
import { LanguageTabs } from './workspace';
import { StudyCard, type StudyResult } from './learning';
import { LANGUAGES, type SessionItem, type Word } from '@/lib/types';
import { studyDate } from '@/lib/utils';

export function StudyPage({ mode }: { mode: 'learn' | 'review' | 'practice' }) {
  const { data, language, run, busy } = useApp();
  const [practiceWord, setPracticeWord] = useState<Word | null>(null);
  const [query, setQuery] = useState('');
  const startedRef = useRef(false);
  const today = studyDate();
  const todaySessions = data.sessions.filter(session => session.study_date === today);
  const session = todaySessions.find(item => item.language === language);
  const sessionItems = data.items.filter(item => item.session_id === session?.id && !item.completed_at && !item.skipped);
  const matching = sessionItems.filter(item => mode === 'learn' ? item.kind === 'new' : item.kind !== 'new');
  const current = matching[0];
  const word = data.words.find(item => item.id === current?.word_id);
  const allModeItems = data.items.filter(item => item.session_id === session?.id && (mode === 'learn' ? item.kind === 'new' : item.kind !== 'new'));
  const completedCount = allModeItems.filter(item => item.completed_at).length;
  const activeSettings = data.settings.filter(item => item.enabled);

  useEffect(() => {
    if (!data.profile.preferred_language || mode === 'practice' || todaySessions.length || startedRef.current || !activeSettings.length) return;
    startedRef.current = true;
    void run('start_daily_sessions');
  }, [data.profile.preferred_language, activeSettings.length, mode, run, todaySessions.length]);

  async function submit(item: SessionItem, result: StudyResult) {
    const ok = await run('submit_answer', { p_item_id:item.id, p_attempt_id:crypto.randomUUID(), p_rating:result.rating, p_answer:result.answer, p_mode:result.mode, p_writing_correct:result.writingCorrect }, 'Đã lưu. Mình tiếp tục nhé!');
    if (!ok) throw new Error('Chưa lưu được kết quả.');
  }
  async function markViewed(item: SessionItem) {
    const ok = await run('mark_item_viewed', { p_item_id:item.id });
    if (!ok) throw new Error('Chưa lưu được trạng thái đã xem. Hãy thử lại nhé.');
  }
  async function practice(result: StudyResult) {
    if (!practiceWord) return;
    const ok = await run('practice_word', { p_word_id:practiceWord.id, p_attempt_id:crypto.randomUUID(), p_answer:result.answer, p_mode:result.mode, p_writing_correct:result.writingCorrect }, 'Đã ghi lại lần luyện thêm.');
    if (!ok) throw new Error('Chưa lưu được kết quả.');
    setPracticeWord(null);
  }

  if (mode === 'practice' && practiceWord) return <StudyLayout title="Luyện viết tự do" detail="Kết quả đúng không đẩy lịch ôn đi xa. Viết sai sẽ giúp từ quay lại sớm hơn." completed={0} total={1}><StudyCard key={practiceWord.id} word={practiceWord} kind="practice" busy={busy} onSubmit={practice} /><button className="text-link study-back" onClick={() => setPracticeWord(null)}><ArrowLeft size={16} /> Chọn từ khác</button></StudyLayout>;
  if (mode === 'practice') {
    const normalized = query.toLocaleLowerCase('vi').trim();
    const learnedIds = new Set(data.progress.map(item => item.word_id));
    const choices = data.words.filter(item => item.language === language && !item.archived && learnedIds.has(item.id) && [item.term,item.pronunciation,item.meaning].some(value => value.toLocaleLowerCase('vi').includes(normalized))).slice(0,60);
    return <><section className="page-heading"><div><p className="eyebrow">LUYỆN BAO NHIÊU TÙY THÍCH</p><h1>Chọn một từ để luyện viết</h1><p className="muted">Luyện lại những từ đã học mà không làm tăng tiến độ ngày.</p></div></section><div className="library-toolbar"><LanguageTabs /><label className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm từ bạn muốn luyện…" aria-label="Tìm từ đã học" /></label></div>{choices.length ? <div className="practice-list">{choices.map(item => <button key={item.id} className="practice-choice panel" onClick={() => setPracticeWord(item)}><span className={`language-symbol ${LANGUAGES[item.language].className}`}>{LANGUAGES[item.language].symbol}</span><div><strong lang={item.language === 'zh' ? 'zh-CN' : 'en'}>{item.term}</strong><span>{item.pronunciation}</span><p>{item.meaning}</p></div><ArrowRight size={18} /></button>)}</div> : <div className="empty-state panel"><BookOpen /><h3>{query ? 'Chưa tìm thấy từ này' : 'Hãy học vài từ trước nhé'}</h3><p>Những từ bạn đã gặp trong bài học sẽ xuất hiện ở đây.</p><Link href="/learn" className="button primary">Đi học từ mới</Link></div>}</>;
  }

  if (!activeSettings.some(item => item.language === language)) {
    return <section className="empty-state panel"><BookOpen /><h2>Lộ trình {LANGUAGES[language].label} đang tạm dừng</h2><p>Bật lại lộ trình trong cài đặt, thay đổi sẽ áp dụng cho ngày học kế tiếp.</p><Link className="button primary" href="/settings">Mở cài đặt</Link></section>;
  }
  if (!session && busy) return <StudyLayout title="Đang chuẩn bị bài học…" detail="Mình đang chọn từ đến hạn và những từ mới phù hợp." completed={0} total={0}><div className="study-loading"><span className="brand-mark pulse">t<span>·</span></span></div></StudyLayout>;
  if (!session) return <StudyLayout title="Chuẩn bị ngày học" detail="Bắt đầu để chọn bài hôm nay. Nếu kết nối bị gián đoạn, bạn có thể thử lại." completed={0} total={0}><button className="button primary" disabled={busy} onClick={() => void run('start_daily_sessions')}>Chuẩn bị bài học</button></StudyLayout>;
  if (!word || !current) return <StudyLayout title={mode === 'learn' ? 'Từ mới hôm nay' : 'Ôn tập hôm nay'} detail={mode === 'learn' ? 'Bạn đã hoàn thành phần từ mới của lộ trình này.' : 'Bạn đã ôn hết những từ đến hạn.'} completed={allModeItems.length} total={allModeItems.length}><section className="study-complete"><span className="completion-mark"><Check size={34} /></span><h2>Xong một chặng rồi!</h2><p>{session?.completed_at ? 'Mục tiêu của lộ trình hôm nay đã hoàn thành.' : mode === 'review' ? 'Giờ mình có thể chuyển sang học từ mới.' : 'Bạn có thể luyện thêm hoặc quay lại vào ngày mai.'}</p><div className="button-row"><Link href={mode === 'review' ? `/learn?language=${language}` : '/'} className="button primary">{mode === 'review' ? 'Học từ mới' : 'Về trang hôm nay'} <ArrowRight size={17} /></Link><Link href={`/practice?language=${language}`} className="button outline">Luyện thêm</Link>{mode === 'learn' && <Link href="/history" className="button outline">Xem từ đã học</Link>}</div></section></StudyLayout>;
  return <StudyLayout title={mode === 'learn' ? 'Từ mới hôm nay' : 'Ôn tập hôm nay'} detail={`${LANGUAGES[language].label} · ${completedCount + 1} trên ${allModeItems.length}`} completed={completedCount} total={allModeItems.length}><StudyCard key={current.id} word={word} kind={current.kind} busy={busy} onSubmit={result => submit(current,result)} viewed={Boolean(current.viewed_at)} onMarkViewed={() => markViewed(current)} /></StudyLayout>;
}

function StudyLayout({ title, detail, completed, total, children }: { title:string; detail:string; completed:number; total:number; children:React.ReactNode }) {
  const percentage = total ? Math.round(completed/total*100) : 0;
  return <div className="study-layout"><header className="study-header"><Link href="/" className="icon-button" aria-label="Về trang hôm nay"><ArrowLeft size={19} /></Link><div><h1>{title}</h1><p>{detail}</p></div><LanguageTabs /></header><div className="study-progress"><div style={{width:`${percentage}%`}} /></div><main className="study-surface">{children}</main><p className="study-quote"><Sparkles size={14} /> Chậm một chút cũng được, miễn là mình vẫn tiếp tục.</p></div>;
}
