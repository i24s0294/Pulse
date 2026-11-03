import { useState, useRef, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Visualizer } from './components/Visualizer/Visualizer';
import { Particles } from './components/Visualizer/Particles';
import { ProgressBar } from './components/Player/ProgressBar';
import { VolumeControl } from './components/Player/VolumeControl';
import { TrackList } from './components/Player/TrackList';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useKeyboard } from './hooks/useKeyboard';
import { useAutoHide } from './hooks/useAutoHide';
import { db } from './lib/db';
import { parseTrackMetadata } from './lib/metadata';
import type { Track } from './types/track';
import './App.css';

export type Preset = 'neon' | 'retro' | 'minimal';

function AudioScene({
  audioSrc,
  isPlaying,
  volume,
  audioRef,
  onEnded,
  coverUrl,
  preset,
}: {
  audioSrc: string;
  isPlaying: boolean;
  volume: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnded: () => void;
  coverUrl?: string;
  preset: Preset;
}) {
  const frequencyData = useAudioAnalyzer(audioRef);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((e) => {
        if (e.name !== 'AbortError') console.warn('Автовоспроизведение заблокировано', e);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume, audioRef]);

  return (
    <>
      <audio ref={audioRef} src={audioSrc} onEnded={onEnded} />
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 2, 3]} intensity={1} />
        <Visualizer frequencyData={frequencyData} coverUrl={coverUrl} preset={preset} />
        <Particles frequencyData={frequencyData} count={500} preset={preset} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </>
  );
}

function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preset, setPreset] = useState<Preset>(() => {
    const saved = localStorage.getItem('player-preset');
    return (saved === 'retro' || saved === 'minimal') ? saved : 'neon';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dragCounterRef = useRef(0);
  const toastTimerRef = useRef<number>(0);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const appRef = useRef<HTMLDivElement>(null);

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('player-volume');
    const parsed = saved !== null ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? parsed : 0.8;
  });

  const currentTrack = tracks[currentIndex] ?? null;

  // UI скрывается через 3 секунды бездействия, но только если играет музыка
  const uiVisible = useAutoHide(3000, isPlaying && isFullscreen);

  const getTrackUrl = (track: Track): string => {
    if (!objectUrlsRef.current.has(track.id)) {
      objectUrlsRef.current.set(track.id, URL.createObjectURL(track.blob));
    }
    return objectUrlsRef.current.get(track.id)!;
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    db.getAll().then((loadedTracks) => {
      setTracks(loadedTracks);
      setIsLoading(false);
    }).catch((err) => {
      console.error('Ошибка загрузки из БД:', err);
      setIsLoading(false);
    });
  }, []);

  // Сохраняем выбранный пресет
  useEffect(() => {
    localStorage.setItem('player-preset', preset);
  }, [preset]);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2500);
  };

  const addFiles = async (files: File[]) => {
    const audioFiles = files.filter((f) => f.type.startsWith('audio'));
    if (audioFiles.length === 0) {
      showToast('Среди этих файлов нет аудио 🙈');
      return;
    }
    if (audioFiles.length < files.length) {
      showToast('Часть файлов пропущена: это не аудио');
    }

    const startIndex = tracks.length;
    const newTracks: Track[] = [];

    for (const file of audioFiles) {
      const metadata = await parseTrackMetadata(file);
      const track: Track = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        size: file.size,
        addedAt: Date.now(),
        ...metadata,
      };
      newTracks.push(track);
    }

    for (const track of newTracks) {
      await db.add(track);
    }

    setTracks((prev) => [...prev, ...newTracks]);

    if (currentIndex === -1) {
      setCurrentIndex(startIndex);
      setIsPlaying(true);
    }
  };

  const playTrack = (index: number) => {
    if (index < 0 || index >= tracks.length) return;
    if (index === currentIndex) {
      setIsPlaying((p) => !p);
      return;
    }
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const playNext = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((currentIndex + 1) % tracks.length);
    setIsPlaying(true);
  }, [currentIndex, tracks.length]);

  const playPrev = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((currentIndex - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [currentIndex, tracks.length]);

  const removeTrack = async (index: number) => {
    const track = tracks[index];
    if (!track) return;

    await db.delete(track.id);
    const url = objectUrlsRef.current.get(track.id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(track.id);
    }
    if (track.coverUrl) URL.revokeObjectURL(track.coverUrl);

    const nextTracks = tracks.filter((_, i) => i !== index);
    setTracks(nextTracks);

    if (index === currentIndex) {
      if (nextTracks.length === 0) {
        setCurrentIndex(-1);
        setIsPlaying(false);
      } else {
        setCurrentIndex(Math.min(index, nextTracks.length - 1));
        setIsPlaying(true);
      }
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleEnded = () => {
    if (tracks.length <= 1) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }
    playNext();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    localStorage.setItem('player-volume', String(value));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounterRef.current += 1;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      appRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Горячие клавиши
  useKeyboard(
    {
      onPlayPause: () => setIsPlaying((p) => !p),
      onNext: playNext,
      onPrev: playPrev,
      onVolumeUp: () => handleVolumeChange(Math.min(1, volume + 0.05)),
      onVolumeDown: () => handleVolumeChange(Math.max(0, volume - 0.05)),
      onFullscreen: toggleFullscreen,
    },
    true
  );

  if (isLoading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Загрузка библиотеки...
      </div>
    );
  }

  return (
    <div
      ref={appRef}
      className={`app ${isFullscreen ? 'fullscreen' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {currentTrack && (
        <AudioScene
          key={currentTrack.id}
          audioSrc={getTrackUrl(currentTrack)}
          isPlaying={isPlaying}
          volume={volume}
          audioRef={audioRef}
          onEnded={handleEnded}
          coverUrl={currentTrack.coverUrl}
          preset={preset}
        />
      )}

      {isDragging && <div className="drop-overlay">🎧 Отпусти треки — и они заиграют</div>}
      {toast && <div className="toast">{toast}</div>}

      {/* Список треков скрывается в полноэкранном режиме */}
      <div className={`track-list-wrapper ${uiVisible ? 'visible' : 'hidden'}`}>
        <TrackList
          tracks={tracks}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          onSelect={playTrack}
          onRemove={removeTrack}
        />
      </div>

      {/* Переключатель пресетов */}
      {currentTrack && (
        <div className={`preset-switcher ${uiVisible ? 'visible' : 'hidden'}`}>
          <button
            className={`preset-btn ${preset === 'neon' ? 'active' : ''}`}
            onClick={() => setPreset('neon')}
            title="Neon"
          >
            🌈
          </button>
          <button
            className={`preset-btn ${preset === 'retro' ? 'active' : ''}`}
            onClick={() => setPreset('retro')}
            title="Retro"
          >
            📼
          </button>
          <button
            className={`preset-btn ${preset === 'minimal' ? 'active' : ''}`}
            onClick={() => setPreset('minimal')}
            title="Minimal"
          >
            ⚪
          </button>
        </div>
      )}

      <div className={`player-panel ${uiVisible ? 'visible' : 'hidden'}`}>
        <div className="track-info">
          <p className="track-title">
            {currentTrack ? (currentTrack.title || currentTrack.name) : 'Выберите треки'}
          </p>
          {currentTrack?.artist && <p className="track-artist">{currentTrack.artist}</p>}
        </div>

        {currentTrack && <ProgressBar audioRef={audioRef} />}

        <div className="controls-row">
          {currentTrack && (
            <>
              <button className="skip-button" onClick={playPrev} title="Предыдущий (←)">⏮</button>
              <button className="play-button" onClick={() => setIsPlaying((p) => !p)} title="Пауза (Space)">
                {isPlaying ? '⏸' : '▶️'}
              </button>
              <button className="skip-button" onClick={playNext} title="Следующий (→)">⏭</button>
              <VolumeControl volume={volume} onChange={handleVolumeChange} />
            </>
          )}

          <label className="upload-button">
            📂 Добавить треки
            <input type="file" accept="audio/*" multiple onChange={handleFileChange} hidden />
          </label>

          {currentTrack && (
            <button className="fullscreen-button" onClick={toggleFullscreen} title="Полный экран (F)">
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          )}
        </div>

        {!currentTrack && (
          <p className="hint">Добавьте треки кнопкой или перетащите файлы в окно</p>
        )}
      </div>

      {currentTrack && !isFullscreen && (
        <div className="rotate-hint">🖱️ Зажмите мышку, чтобы вращать сферу · F — полный экран</div>
      )}
    </div>
  );
}

export default App;