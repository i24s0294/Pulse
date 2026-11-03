export interface Track {
  id: string;
  name: string; // fallback, если метаданных нет
  title?: string; // из метаданных
  artist?: string; // из метаданных
  coverUrl?: string; // Object URL обложки альбома
  blob: Blob;
  size: number;
  addedAt: number;
}