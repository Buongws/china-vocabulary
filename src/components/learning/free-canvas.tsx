"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Eraser } from "lucide-react";
import styles from "./learning.module.css";

export function FreeCanvas({ onComplete, disabled }: { onComplete: (correct: boolean) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function coordinates(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = coordinates(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = "#68518b";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = coordinates(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasDrawn(true);
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  return (
    <div className={styles.freeCanvas}>
      <p className={styles.fallbackNote}>Chữ này chưa có dữ liệu nét. Bạn có thể viết tự do và tự đánh giá; ứng dụng không tự chấm nét ở chế độ này.</p>
      <canvas ref={canvasRef} width={520} height={520} className={styles.writingCanvas} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} aria-label="Ô viết chữ tự do bằng chuột hoặc cảm ứng" />
      <button type="button" className="button" onClick={clear} disabled={disabled || !hasDrawn}><Eraser size={16} aria-hidden="true" /> Xóa nét</button>
      <div className={styles.actions}>
        <button type="button" className="button" onClick={() => onComplete(false)} disabled={disabled}>Tôi chưa viết đúng</button>
        <button type="button" className="button primary" onClick={() => onComplete(true)} disabled={disabled || !hasDrawn}>Tôi đã viết đúng</button>
      </div>
    </div>
  );
}
