import type { Track } from '../../types/track';
import './TrackList.css';

interface TrackListProps {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}

export function TrackList({
  tracks,
  currentIndex,
  isPlaying,
  onSelect,
  onRemove,
}: TrackListProps) {
  if (tracks.length === 0) return null;

  return (
    <aside className="track-list">
      <header className="track-list-header">
        <span>Плейлист</span>
        <span className="track-count">{tracks.length}</span>
      </header>
      <ul>
        {tracks.map((track, index) => (
          <li
            key={track.id}
            className={`track-item ${index === currentIndex ? 'active' : ''}`}
            onClick={() => onSelect(index)}
            title={track.title || track.name}
          >
            {track.coverUrl && (
              <img src={track.coverUrl} alt="cover" className="track-cover" />
            )}
            <span className="track-index">
              {index === currentIndex ? (
                <span className={`eq ${isPlaying ? 'playing' : ''}`}>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                index + 1
              )}
            </span>
            <div className="track-item-info">
              <span className="track-item-name">{track.title || track.name}</span>
              {track.artist && <span className="track-item-artist">{track.artist}</span>}
            </div>
            <button
              className="track-remove"
              title="Убрать из плейлиста"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}