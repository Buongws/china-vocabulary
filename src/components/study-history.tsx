'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle2, ChevronRight, FolderOpen } from 'lucide-react';
import { useApp } from './app-context';
import { LANGUAGES, type Language, type Rating, type Snapshot, type Word } from '@/lib/types';
import { formatDate, studyDate } from '@/lib/utils';

type LearnedWord = { word: Word; language: Language; rating: Rating | null; nextReviewDate?: string };
type HistoryDay = { date: string; words: LearnedWord[] };

function ratingLabel(rating: Rating | null) {
  return ({ forgot: 'Cần ôn lại', hard: 'Khó', good: 'Đã nhớ', easy: 'Rất dễ' } as const)[rating ?? 'good'];
}

function buildHistory(data: Snapshot): HistoryDay[] {
  const sessions = new Map(data.sessions.map(session => [session.id, session]));
  const words = new Map(data.words.map(word => [word.id, word]));
  const progress = new Map(data.progress.map(item => [item.word_id, item]));
  const byDate = new Map<string, LearnedWord[]>();
  for (const item of data.items) {
    if (item.kind !== 'new' || !item.completed_at || item.skipped) continue;
    const session = sessions.get(item.session_id);
    const word = words.get(item.word_id);
    if (!session || !word) continue;
    const learned = { word, language: session.language, rating: item.rating, nextReviewDate: progress.get(word.id)?.next_review_date };
    byDate.set(session.study_date, [...(byDate.get(session.study_date) ?? []), learned]);
  }
  return [...byDate.entries()].map(([date, words]) => ({ date, words: words.sort((a, b) => a.word.order_index - b.word.order_index) })).sort((a, b) => b.date.localeCompare(a.date));
}

export function StudyHistoryPage() {
  const { data, language } = useApp();
  const days = buildHistory(data);
  const today = studyDate();
  return <div className="history-page">
    <section className="page-heading history-heading"><div><p className="eyebrow">NHẬT KÝ TỪ MỚI</p><h1>Danh sách từ đã học</h1><p className="muted">Mỗi folder là một ngày. Mở ra để xem lại các từ mới bạn đã hoàn thành.</p></div>{days.length > 0 && <span className="history-total"><CheckCircle2 size={17} /> {days.reduce((sum, day) => sum + day.words.length, 0)} từ</span>}</section>
    {days.length ? <div className="history-folders">{days.map(day => {
      const languages = [...new Set(day.words.map(item => item.language))];
      return <details className="history-folder panel" key={day.date} open={day.date === today}><summary><span className="history-folder-icon"><FolderOpen size={21} /></span><span className="history-folder-title"><strong>{day.date === today ? 'Hôm nay' : formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong><small>{day.words.length} từ mới đã hoàn thành</small></span><span className="history-languages">{languages.map(code => <i key={code} className={`language-symbol ${LANGUAGES[code].className}`} title={LANGUAGES[code].label}>{LANGUAGES[code].symbol}</i>)}</span><ChevronRight className="history-chevron" size={19} /></summary><div className="history-word-list">{day.words.map(({ word, language: wordLanguage, rating, nextReviewDate }) => <article className="history-word" key={`${day.date}-${word.id}`}><span className="history-check"><CheckCircle2 size={18} /></span><div className="history-word-copy"><div><strong lang={wordLanguage === 'zh' ? 'zh-CN' : 'en'}>{word.term}</strong><span>{word.pronunciation}</span></div><p>{word.meaning}</p></div><div className="history-word-meta"><small>{ratingLabel(rating)}</small>{nextReviewDate && <span>Ôn lại {formatDate(nextReviewDate, { day: 'numeric', month: 'numeric' })}</span>}</div></article>)}</div></details>;
    })}</div> : <section className="empty-state panel"><BookOpen /><h2>Chưa có từ mới hoàn thành</h2><p>Sau khi hoàn thành bài từ mới, các từ sẽ tự xuất hiện ở đây theo ngày học.</p><Link href={`/learn?language=${language}`} className="button primary">Học từ mới</Link></section>}
  </div>;
}
