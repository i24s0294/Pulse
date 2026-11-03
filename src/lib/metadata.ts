import type { Track } from '../types/track';

// Свои интерфейсы — не зависим от @types/jsmediatags
interface Tags {
  title?: string;
  artist?: string;
  picture?: {
    data: number[];
    format: string;
  };
}

interface JsmediatagsError {
  type: string;
  info: string;
}

export async function parseTrackMetadata(file: File): Promise<Partial<Track>> {
  const { default: jsmediatags } = await import('jsmediatags');

  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (result: { tags: Tags }) => {
        const tags = result.tags;
        const parsed: Partial<Track> = {};

        if (tags.title) parsed.title = tags.title.trim();
        if (tags.artist) parsed.artist = tags.artist.trim();

        if (tags.picture) {
          const { data, format } = tags.picture;
          const uint8Array = new Uint8Array(data);
          const blob = new Blob([uint8Array], { type: format });
          parsed.coverUrl = URL.createObjectURL(blob);
        }

        resolve(parsed);
      },
      onError: (error: JsmediatagsError) => {
        console.warn('Не удалось прочитать метаданные:', error.info);
        resolve({});
      },
    });
  });
}