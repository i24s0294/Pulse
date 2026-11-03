import { useEffect, useState } from 'react';

export function useAutoHide(delayMs: number, enabled: boolean) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }

    let timer: number;
    const show = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), delayMs);
    };

    // Показываем UI при любом движении мыши, клике, нажатии клавиши
    window.addEventListener('mousemove', show);
    window.addEventListener('mousedown', show);
    window.addEventListener('keydown', show);
    window.addEventListener('touchstart', show);

    // Запускаем таймер сразу
    show();

    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('mousedown', show);
      window.removeEventListener('keydown', show);
      window.removeEventListener('touchstart', show);
      window.clearTimeout(timer);
    };
  }, [delayMs, enabled]);

  return visible;
}