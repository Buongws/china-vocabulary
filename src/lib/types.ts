export type Language = 'zh' | 'en';
export type Rating = 'forgot' | 'hard' | 'good' | 'easy';
export type PracticeMode = 'hanzi' | 'dictation' | 'cloze' | 'meaning';
export type Word = {
  id: string; deck_id: string; language: Language; term: string; pronunciation: string;
  meaning: string; example_sentence: string; example_translation: string; accepted_answers: string[];
  archived?: boolean; order_index: number;
};
export type Deck = { id: string; owner_id: string | null; language: Language; name: string; description: string; level: string; archived?: boolean; created_at?: string; order_index?: number };
export type LanguageSettings = { language: Language; enabled: boolean; daily_target: number; deck_ids: string[]; auto_pace: boolean; pending?: Partial<LanguageSettings> | null; pending_enabled?: boolean | null; pending_daily_target?: number | null; pending_deck_ids?: string[] | null; pending_auto_pace?: boolean | null; effective_date?: string | null; created_at?: string };
export type Progress = { word_id: string; language: Language; repetitions: number; ease_factor: number; interval_days: number; next_review_date: string; last_reviewed_at: string; status: string };
export type Session = { id: string; language: Language; study_date: string; new_target: number; review_target: number; completed_at: string | null };
export type SessionItem = { id: string; session_id: string; word_id: string; kind: 'new' | 'review' | 'maintenance'; completed_at: string | null; rating: Rating | null; is_correct: boolean | null; skipped?: boolean; viewed_at?: string | null };
export type Attempt = { word_id: string; language: Language; is_correct: boolean; mode: PracticeMode; created_at: string };
export type Notification = { id: string; type: string; message: string; created_at: string; read_at: string | null };
export type Snapshot = {
  profile: { id: string; display_name: string; preferred_language: Language | null; reminder_time: string; reminders_enabled: boolean; created_at: string };
  settings: LanguageSettings[]; decks: Deck[]; words: Word[]; progress: Progress[]; sessions: Session[];
  items: SessionItem[]; attempts: Attempt[]; completed_days: string[]; notifications: Notification[];
  couple: { id: string; created_at: string; invite_code?: string | null; invite_expires_at?: string | null; completed_days?: string[] } | null;
  partner: { display_name: string; completed_today: boolean; learned_count: number; streak: number } | null;
};
export const LANGUAGES = {
  zh: { label: 'Tiếng Trung', short: 'Trung', symbol: '中', locale: 'zh-CN', className: 'chinese' },
  en: { label: 'Tiếng Anh', short: 'Anh', symbol: 'Aa', locale: 'en-US', className: 'english' },
} as const;
