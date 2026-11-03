import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  audioRef: RefObject<HTMLAudioElement | null>;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ audioRef }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && fillRef.current && currentRef.current && durationRef.current) {
        const duration = audio.duration;
        const progress =
          Number.isFinite(duration) && duration > 0
            ? (audio.currentTime / duration) * 100
            : 0;
        fillRef.current.style.width = `${progress}%`;
        currentRef.current.textContent = formatTime(audio.currentTime);
        durationRef.current.textContent = formatTime(duration);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioRef]);

  const seek = (clientX: number) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar || !Number.isFinite(audio.duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  };

  return (
    <div className="progress-bar">
      <span ref={currentRef} className="progress-time">0:00</span>

      <div
        ref={barRef}
        className="progress-track"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seek(e.clientX);
        }}
      >
        <div ref={fillRef} className="progress-fill" />
      </div>

      <span ref={durationRef} className="progress-time">0:00</span>
    </div>
  );
}