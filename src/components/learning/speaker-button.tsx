"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, LoaderCircle } from "lucide-react";
import styles from "./learning.module.css";

export function useSpeech(language: "zh" | "en") {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
    const synth = window.speechSynthesis;
    const update = () => {
      const voices = synth.getVoices();
      const matching = voices.find((item) => item.lang.toLowerCase() === (language === "zh" ? "zh-cn" : "en-us"))
        ?? voices.find((item) => item.lang.toLowerCase().startsWith(language));
      setVoice(matching ?? null);
      if (voices.length) setReady(true);
    };
    const initial = window.setTimeout(update, 0);
    const timeout = window.setTimeout(() => setReady(true), 2_000);
    synth.addEventListener("voiceschanged", update);
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(timeout);
      synth.removeEventListener("voiceschanged", update);
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        synth.cancel();
      }
    };
  }, [language]);

  function speak(text: string, onUnavailable?: () => void) {
    if (!voice || !("speechSynthesis" in window)) {
      setError("Thiết bị chưa có giọng đọc phù hợp cho ngôn ngữ này.");
      onUnavailable?.();
      return;
    }
    const synth = window.speechSynthesis;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.voice = voice;
    utterance.lang = language === "zh" ? "zh-CN" : "en-US";
    utterance.rate = language === "zh" ? 0.75 : 0.85;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = (event) => {
      setPlaying(false);
      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError("Không phát được âm thanh. Bạn có thể luyện theo nghĩa.");
        onUnavailable?.();
      }
    };
    setError(null);
    setPlaying(true);
    try {
      synth.speak(utterance);
    } catch {
      setPlaying(false);
      setError("Không phát được âm thanh. Bạn có thể luyện theo nghĩa.");
      onUnavailable?.();
    }
  }

  return { ready, available: voice !== null, playing, error, speak };
}

export function SpeakerButton({ term, language }: { term: string; language: "zh" | "en" }) {
  const speech = useSpeech(language);
  return (
    <div className={styles.speakerWrap}>
      <button type="button" className={styles.audioButton} onClick={() => speech.speak(term)} disabled={!speech.ready || !speech.available} aria-label="Nghe phát âm">
        {!speech.ready || speech.playing ? <LoaderCircle size={19} className={styles.spin} aria-hidden="true" /> : <Volume2 size={19} aria-hidden="true" />}
        {speech.playing ? "Đang phát…" : "Nghe phát âm"}
      </button>
      {speech.error || (speech.ready && !speech.available) ? <small className={styles.voiceNote} role="status">{speech.error ?? "Thiết bị chưa có giọng đọc phù hợp."}</small> : null}
    </div>
  );
}
