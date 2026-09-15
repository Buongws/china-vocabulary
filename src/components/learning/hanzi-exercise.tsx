"use client";

import { useEffect, useRef, useState } from "react";
import type HanziWriter from "hanzi-writer";
import { Check, ChevronRight, Eye, LoaderCircle, PencilLine, RotateCcw } from "lucide-react";
import { FreeCanvas } from "./free-canvas";
import styles from "./learning.module.css";

type WritingMode = "demo" | "guided" | "test";

export function HanziExercise({ term, onComplete }: { term: string; onComplete: (correct: boolean) => void }) {
  const characters = Array.from(term).filter((character) => /\p{Script=Han}/u.test(character));
  const [mode, setMode] = useState<WritingMode | null>(null);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "ready" | "missing">("idle");
  const [characterDone, setCharacterDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [firstResult, setFirstResult] = useState<boolean | null>(null);
  const firstCorrectRef = useRef(true);
  const resultSentRef = useRef(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const character = characters[index];

  function completeCharacter(correct: boolean) {
    if (mode === "test" && !correct) firstCorrectRef.current = false;
    setCharacterDone(true);
    if (index === characters.length - 1 && mode === "test") {
      setFinished(true);
      if (!resultSentRef.current) {
        resultSentRef.current = true;
        setFirstResult(firstCorrectRef.current);
        onComplete(firstCorrectRef.current);
      }
    }
  }

  const completeRef = useRef(completeCharacter);
  useEffect(() => { completeRef.current = completeCharacter; });

  useEffect(() => {
    if (!mode || !character || !targetRef.current) return;
    const controller = new AbortController();
    const container = targetRef.current;
    let writer: HanziWriter | null = null;
    let disposed = false;

    async function setup() {
      try {
        const [module, response] = await Promise.all([
          import("hanzi-writer"),
          fetch(`/hanzi/${encodeURIComponent(character)}.json`, { signal: controller.signal }),
        ]);
        if (!response.ok) throw new Error("Missing character data");
        const data = await response.json();
        if (disposed) return;
        writer = module.default.create(container, character, {
          width: 260, height: 260, padding: 22,
          showCharacter: false, showOutline: mode === "guided",
          strokeColor: "#776090", radicalColor: "#c78788", outlineColor: "#eee7f3",
          drawingColor: "#665283", highlightColor: "#bd90b4",
          delayBetweenStrokes: 200, strokeAnimationSpeed: 0.85,
          showHintAfterMisses: mode === "test" ? false : 2,
          charDataLoader: () => data,
        });
        writerRef.current = writer;
        setLoadStatus("ready");
        if (mode === "demo") {
          await writer.animateCharacter();
          if (!disposed) setCharacterDone(true);
          return;
        }
        writer.quiz({
          onMistake: (stroke) => {
            if (disposed) return;
            setMistakes(stroke.totalMistakes);
            if (mode === "test") firstCorrectRef.current = false;
          },
          onComplete: (summary) => {
            if (!disposed) completeRef.current(summary.totalMistakes === 0);
          },
        });
      } catch {
        if (!disposed) setLoadStatus("missing");
      }
    }
    void setup();
    return () => {
      disposed = true;
      controller.abort();
      writer?.cancelQuiz();
      writer?.pauseAnimation();
      writerRef.current = null;
      container.replaceChildren();
    };
  }, [character, mode, run]);

  function start(nextMode: WritingMode) {
    setMode(nextMode);
    setIndex(0);
    setFinished(false);
    setCharacterDone(false);
    setMistakes(0);
    setLoadStatus("loading");
    setRun((value) => value + 1);
  }

  function nextCharacter() {
    setIndex((value) => value + 1);
    setCharacterDone(false);
    setMistakes(0);
    setLoadStatus("loading");
  }

  function skipCharacter() {
    writerRef.current?.cancelQuiz();
    void writerRef.current?.showCharacter();
    completeCharacter(false);
  }

  const testInProgress = mode === "test" && !finished;

  if (!characters.length) {
    return <FreeCanvas disabled={firstResult !== null} onComplete={(correct) => {
      if (resultSentRef.current) return;
      resultSentRef.current = true;
      setFirstResult(correct);
      onComplete(correct);
    }} />;
  }

  return (
    <section className={styles.hanziExercise} aria-label="Luyện viết chữ Hán">
      <div className={styles.writingModes}>
        <button className={`button ${mode === "demo" ? "primary" : ""}`} type="button" onClick={() => start("demo")} disabled={testInProgress}><Eye size={16} aria-hidden="true" /> Xem thứ tự nét</button>
        <button className={`button ${mode === "guided" ? "primary" : ""}`} type="button" onClick={() => start("guided")} disabled={testInProgress}><PencilLine size={16} aria-hidden="true" /> Tập theo mẫu</button>
        <button className={`button ${mode === "test" ? "primary" : ""}`} type="button" onClick={() => start("test")} disabled={testInProgress}><Check size={16} aria-hidden="true" /> {firstResult !== null ? "Viết lại" : "Kiểm tra viết"}</button>
      </div>

      {!mode ? <div className={styles.writingIntro}><PencilLine size={30} aria-hidden="true" /><p>Quan sát nét, tập theo mẫu, rồi kiểm tra trí nhớ của bạn.</p><small>Hoàn thành “Kiểm tra viết” để lưu bài học.</small></div> : (
        <>
          <div className={styles.glyphProgress} aria-label={`Chữ thứ ${index + 1} trên ${characters.length}`}>
            {characters.map((_, glyphIndex) => <span key={glyphIndex} className={glyphIndex === index ? styles.activeGlyph : ""}>{glyphIndex < index ? <Check size={13} aria-hidden="true" /> : glyphIndex + 1}</span>)}
          </div>
          <p className={styles.writingPrompt}>{mode === "demo" ? `Thứ tự nét: ${character}` : mode === "guided" ? `Tô theo nét mờ: ${character}` : `Viết chữ thứ ${index + 1} theo trí nhớ`}</p>
          <div className={styles.writerFrame} hidden={loadStatus === "missing"}>
            <div ref={targetRef} className={styles.writerTarget} />
            {loadStatus === "loading" ? <div className={styles.writerLoading}><LoaderCircle className={styles.spin} size={25} /><span>Đang tải nét chữ…</span></div> : null}
          </div>
          {loadStatus === "missing" ? <FreeCanvas key={`${index}-${run}`} onComplete={completeCharacter} disabled={characterDone} /> : null}
          {mistakes > 0 ? <p className={styles.mistakeNote} role="status">{mistakes} nét cần sửa. Chậm lại một chút, bạn làm được mà.</p> : null}
          {characterDone && index < characters.length - 1 ? <button type="button" className="button primary" onClick={nextCharacter}>Chữ tiếp theo <ChevronRight size={16} aria-hidden="true" /></button> : null}
          {characterDone && index === characters.length - 1 && mode !== "test" ? <button type="button" className="button primary" onClick={() => start("test")}>Sẵn sàng kiểm tra <ChevronRight size={16} aria-hidden="true" /></button> : null}
          {mode === "test" && loadStatus === "ready" && !characterDone ? <button type="button" className={styles.textButton} onClick={skipCharacter}>Tôi chưa nhớ nét này — xem đáp án</button> : null}
          {mode !== "test" && loadStatus === "ready" ? <button type="button" className={styles.textButton} onClick={() => { setCharacterDone(false); setMistakes(0); setRun((value) => value + 1); }}><RotateCcw size={14} aria-hidden="true" /> Tập lại chữ này</button> : null}
        </>
      )}
      {firstResult !== null ? <p className={firstResult ? styles.correctNotice : styles.incorrectNotice} role="status">{firstResult ? "Bạn đã viết đúng tất cả các chữ ngay lần đầu!" : "Mình sẽ gặp lại từ này sớm để nhớ chắc hơn. Kết quả lần viết đầu đã được giữ lại."}</p> : null}
      <small className={styles.writingHint}>Chỉ lần kiểm tra đầu tiên được chấm. Bài viết có nét sai được tính là “Quên”.</small>
    </section>
  );
}
