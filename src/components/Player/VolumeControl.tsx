import { useRef } from 'react';
import './VolumeControl.css';

interface VolumeControlProps {
  volume: number; // 0..1
  onChange: (value: number) => void;
}

function volumeIcon(volume: number): string {
  if (volume === 0) return '🔇';
  if (volume < 0.5) return '🔉';
  return '🔊';
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  // Запоминаем громкость перед мьютом, чтобы вернуть её по клику
  const prevVolumeRef = useRef<number>(0.8);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      onChange(0);
    } else {
      onChange(prevVolumeRef.current || 0.8);
    }
  };

  return (
    <div className="volume-control">
      <button
        className="volume-button"
        onClick={toggleMute}
        title={volume === 0 ? 'Включить звук' : 'Выключить звук'}
      >
        {volumeIcon(volume)}
      </button>
      <input
        className="volume-slider"
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label="Громкость"
      />
    </div>
  );
}