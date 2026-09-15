"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, Check, Eye, Headphones, Keyboard, LoaderCircle, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import type { Word } from "@/lib/types";
import { blankExample, isCorrectAnswer, type RecallRating } from "@/lib/learning";
import { HanziExercise } from "./hanzi-exercise";
import { SpeakerButton, useSpeech } from "./speaker-button";
import styles from "./learning.module.css";

export type ExerciseMode = "hanzi" | "dictation" | "cloze" | "meaning";
export interface StudyResult {
  rating: RecallRating;
  answer: string;
  mode: ExerciseMode;
  writingCorrect: boolean;
}

export interface StudyCardProps {
  word: Word;
  kind: "new" | "review" | "maintenance" | "practice";
  onSubmit: (result: StudyResult) => Promise<void>;
  busy?: boolean;
  onMarkViewed?: () => Promise<void>;
  viewed?: boolean;
}

const RATINGS: { value: RecallRating; label: string; detail: string; symbol: string }[] = [
  { value: "forgot", label: "Quên", detail: "Cần ôn lại", symbol: "↻" },
  { value: "hard", label: "Khó", detail: "Hơi vất vả", symbol: "◔" },
  { value: "good", label: "Nhớ", detail: "Mình nhớ rồi", symbol: "✓" },
  { value: "easy", label: "Dễ", detail: "Rất tự tin", symbol: "✦" },
];

export function StudyCard({ word, kind, onSubmit, onMarkViewed, viewed = false, busy = false }: StudyCardProps) {
  const [stage, setStage] = useState<"card" | "exercise">("card");
  const [revealed, setRevealed] = useState(kind === "new");
  const [mode, setMode] = useState<Exclude<ExerciseMode, "hanzi">>("dictation");
  const [answer, setAnswer] = useState("");
  const [firstAttempt, setFirstAttempt] = useState<{ answer: string; correct: boolean; mode: ExerciseMode } | null>(null);
  const [writingCorrect, setWritingCorrect] = useState<boolean | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [rating, setRating] = useState<RecallRating | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const speech = useSpeech(word.language);
  const isChinese = word.language === "zh";
  const cloze = blankExample(word.example_sentence, word.term);
  const effectiveMode = mode === "dictation" && ((speech.ready && !speech.available) || audioFailed) ? "meaning" : mode;
  const done = isChinese ? writingCorrect !== null : firstAttempt !== null;
  const correct = isChinese ? writingCorrect : firstAttempt?.correct;
  const locked = busy || submitting;

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || !answer.trim()) return;
    const result = isCorrectAnswer(answer, word.term, word.accepted_answers);
    if (!firstAttempt) setFirstAttempt({ answer: answer.trim(), correct: result, mode: effectiveMode });
    else setRetryFeedback(result);
  }

  async function save() {
    if (!rating || !done || submittingRef.current || busy) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ rating, answer: isChinese ? word.term : firstAttempt!.answer, mode: isChinese ? "hanzi" : firstAttempt!.mode, writingCorrect: Boolean(correct) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa lưu được bài học. Vui lòng thử lại; kết quả vẫn được giữ ở đây.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function markViewed() {
    if (!onMarkViewed || submittingRef.current || locked) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try { await onMarkViewed(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được trạng thái đã xem."); }
    finally { submittingRef.current = false; setSubmitting(false); }
  }

  return (
    <div className={styles.studyCard}>
      <div className={styles.cardMeta}>
        <span className={styles.languagePill}>{isChinese ? "中文 · TIẾNG TRUNG" : "Aa · TIẾNG ANH"}</span>
        <span className={styles.kindLabel}>{kind === "new" ? "Từ mới" : kind === "review" ? "Ôn tập" : kind === "maintenance" ? "Ôn duy trì" : "Luyện thêm"}</span>
      </div>
      {stage === "card" ? (
        <>
          <div className={`${styles.flashcard} ${isChinese ? styles.chineseCard : styles.englishCard}`}>
            <div className={styles.cardAccent} aria-hidden="true">✧</div>
            <span className={styles.eyebrow}>{revealed ? "MỖI TỪ MỚI, MỘT CHÚT TIẾN BỘ" : "BẠN CÒN NHỚ TỪ NÀY KHÔNG?"}</span>
            {revealed ? <>
              <h2 className={isChinese ? styles.chineseTerm : styles.englishTerm} lang={isChinese ? "zh-CN" : "en"}>{word.term}</h2>
              <p className={styles.pronunciation}>{word.pronunciation}</p>
              <SpeakerButton term={word.term} language={word.language} />
              <div className={styles.meaningDivider} />
              <p className={styles.meaning}>{word.meaning}</p>
              <div className={styles.example}><BookOpen size={16} aria-hidden="true" /><div><p lang={isChinese ? "zh-CN" : "en"}>{word.example_sentence}</p><small>{word.example_translation}</small></div></div>
            </> : <>
              <div className={styles.memoryIcon} aria-hidden="true"><Sparkles size={29} /></div>
              <h2 className={styles.recallMeaning}>{word.meaning}</h2>
              <p className={styles.recallHint}>Thử nhớ lại từ và cách viết trước khi xem đáp án nhé.</p>
              <button className={styles.revealButton} type="button" onClick={() => setRevealed(true)}><Eye size={17} aria-hidden="true" /> Lật thẻ xem đáp án</button>
            </>}
          </div>
          <div className={styles.cardFooter}><p>{kind === "practice" ? "Luyện thêm giúp bạn nhớ chắc hơn." : "Một chút mỗi ngày, cùng nhau đi thật xa."}</p><div className="button-row">{onMarkViewed && <button type="button" className="button outline" onClick={() => void markViewed()} disabled={viewed || locked || !revealed}>{submitting ? <LoaderCircle size={17} className={styles.spin} /> : <Eye size={17} />}{submitting ? 'Đang lưu…' : viewed ? 'Đã xem từ' : 'Đánh dấu đã xem'}</button>}<button type="button" className="button primary" disabled={locked} onClick={() => setStage("exercise")}>Luyện tập <ArrowRight size={17} aria-hidden="true" /></button></div></div>
          {onMarkViewed && <p className={styles.scheduleNote}>Đã xem chưa tính là hoàn thành bài. Luyện tập và lưu kết quả để cập nhật tiến độ, lịch ôn.</p>}
          {error && <p role="alert" className={styles.incorrectNotice}>{error}</p>}
        </>
      ) : (
        <div className={styles.exercise}>
          <div className={styles.exerciseHeading}><div><span className={styles.eyebrow}>HỌC BẰNG CÁCH NHỚ LẠI</span><h2>{isChinese ? "Viết một chút, nhớ lâu hơn" : "Đến lượt bạn rồi"}</h2></div><span className={styles.exerciseIcon} aria-hidden="true">{isChinese ? <span>写</span> : <Keyboard size={25} />}</span></div>

          {isChinese ? <><p className={styles.exerciseMeaning}>{word.meaning}</p><p className={styles.pronunciation}>{word.pronunciation}</p><HanziExercise term={word.term} onComplete={setWritingCorrect} /></> : <>
            <div className={styles.exerciseTabs} aria-label="Chọn kiểu luyện tập">
              <button type="button" onClick={() => { setMode("dictation"); setAudioFailed(false); }} disabled={!!firstAttempt || locked || (speech.ready && !speech.available)} className={effectiveMode === "dictation" ? styles.selectedTab : ""} aria-pressed={effectiveMode === "dictation"}><Headphones size={16} aria-hidden="true" /> Nghe & viết</button>
              <button type="button" onClick={() => setMode("meaning")} disabled={!!firstAttempt || locked} className={effectiveMode === "meaning" ? styles.selectedTab : ""} aria-pressed={effectiveMode === "meaning"}><Keyboard size={16} aria-hidden="true" /> Gõ theo nghĩa</button>
              <button type="button" onClick={() => setMode("cloze")} disabled={!!firstAttempt || locked || !cloze} className={effectiveMode === "cloze" ? styles.selectedTab : ""} aria-pressed={effectiveMode === "cloze"}><BookOpen size={16} aria-hidden="true" /> Điền từ</button>
            </div>
            {!firstAttempt ? <>
              {effectiveMode === "dictation" ? <div className={styles.dictationPrompt}><button type="button" className={styles.listenCircle} onClick={() => speech.speak(word.term, () => setAudioFailed(true))} disabled={!speech.ready || !speech.available || locked} aria-label="Nghe từ cần viết">{!speech.ready || speech.playing ? <LoaderCircle size={31} className={styles.spin} aria-hidden="true" /> : <Volume2 size={31} aria-hidden="true" />}</button><p>{!speech.ready ? "Đang tìm giọng đọc…" : "Lắng nghe và viết từ bạn nghe được"}</p><small>Bạn có thể nghe lại bao nhiêu lần tùy thích.</small></div> : <div className={styles.questionPrompt}><span className={styles.eyebrow}>{effectiveMode === "cloze" ? "ĐIỀN TỪ CÒN THIẾU" : "TỪ TIẾNG ANH NÀO CÓ NGHĨA LÀ…"}</span><p lang={effectiveMode === "cloze" ? "en" : "vi"}>{effectiveMode === "cloze" ? cloze : word.meaning}</p>{effectiveMode === "cloze" ? <small>{word.example_translation}</small> : null}</div>}
              {mode === "dictation" && effectiveMode !== "dictation" ? <p className={styles.fallbackNote} role="status">{speech.error ?? "Chưa có giọng đọc tiếng Anh trên thiết bị này."} Mình chuyển sang luyện theo nghĩa nhé.</p> : null}
            </> : <div className={firstAttempt.correct ? styles.answerCorrect : styles.answerIncorrect} role="status"><span className={styles.answerIcon} aria-hidden="true">{firstAttempt.correct ? <Check size={21} /> : <RotateCcw size={21} />}</span><div><strong>{firstAttempt.correct ? "Chính xác, bạn nhớ rất tốt!" : "Gần đúng rồi, cùng ghi nhớ lại nhé."}</strong><p lang="en">{word.term} <span>{word.pronunciation}</span></p><small>{word.meaning}</small><p className={styles.feedbackExample} lang="en">{word.example_sentence}</p></div></div>}

            {!firstAttempt || retrying ? <form onSubmit={checkAnswer} className={styles.answerForm}><label htmlFor={`answer-${word.id}`}>{retrying ? "Viết lại từ để nhớ chắc hơn" : "Câu trả lời của bạn"}</label><div className={styles.answerInputRow}><input id={`answer-${word.id}`} className="field" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Nhập từ tiếng Anh…" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={locked || (effectiveMode === "dictation" && !speech.ready)} autoFocus /><button type="submit" className="button primary" disabled={!answer.trim() || locked || (effectiveMode === "dictation" && !speech.ready)}>Kiểm tra <ArrowRight size={16} aria-hidden="true" /></button></div>{retryFeedback !== null ? <p className={retryFeedback ? styles.correctNotice : styles.incorrectNotice} role="status">{retryFeedback ? "Đúng rồi! Kết quả lần đầu vẫn được giữ để lên lịch ôn phù hợp." : "Thử lại nhé. Bạn có thể đối chiếu đáp án ở trên."}</p> : null}</form> : <button type="button" className={styles.textButton} onClick={() => { setRetrying(true); setAnswer(""); }}><RotateCcw size={14} aria-hidden="true" /> Gõ lại để luyện thêm</button>}
          </>}

          {done ? <section className={styles.ratingSection} aria-label="Tự đánh giá mức độ ghi nhớ"><h3>Bạn cảm thấy mình nhớ từ này thế nào?</h3><div className={styles.ratingGrid}>{RATINGS.map((item) => <button type="button" key={item.value} className={`${styles.ratingButton} ${styles[item.value]} ${rating === item.value ? styles.ratingSelected : ""}`} aria-pressed={rating === item.value} onClick={() => setRating(item.value)} disabled={locked}><span aria-hidden="true">{item.symbol}</span><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div>{!correct ? <p className={styles.scheduleNote}>Lần viết đầu chưa chính xác nên từ này sẽ được ôn lại vào ngày mai.</p> : null}{kind === "practice" ? <p className={styles.scheduleNote}>Luyện thêm đúng không đẩy lịch ôn xa hơn. Một lần sai có thể đưa lịch ôn về ngày mai.</p> : null}<button type="button" className={`button primary ${styles.saveButton}`} onClick={save} disabled={!rating || locked}>{locked ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{locked ? "Đang lưu…" : kind === "practice" ? "Lưu lần luyện" : "Hoàn thành bài & tiếp tục"}</button>{error ? <p role="alert" className={styles.incorrectNotice}>{error}</p> : null}</section> : null}
        </div>
      )}
    </div>
  );
}
