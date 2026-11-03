import { useEffect } from 'react';

interface KeyBindings {
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onFullscreen?: () => void;
}

export function useKeyboard(bindings: KeyBindings, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleKey = (e: KeyboardEvent) => {
      // Игнорируем, если фокус в input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          bindings.onPlayPause?.();
          break;
        case 'ArrowRight':
          bindings.onNext?.();
          break;
        case 'ArrowLeft':
          bindings.onPrev?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          bindings.onVolumeUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          bindings.onVolumeDown?.();
          break;
        case 'KeyF':
          bindings.onFullscreen?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [bindings, enabled]);
}