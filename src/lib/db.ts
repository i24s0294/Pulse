import { openDB, type DBSchema } from 'idb';
import type { Track } from '../types/track';

interface PulseDB extends DBSchema {
  tracks: {
    key: string;
    value: Track;
  };
}

const DB_NAME = 'pulse-player-db';
const STORE_NAME = 'tracks';

const dbPromise = openDB<PulseDB>(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export const db = {
  async getAll(): Promise<Track[]> {
    return (await dbPromise).getAll(STORE_NAME);
  },
  async add(track: Track): Promise<void> {
    await (await dbPromise).put(STORE_NAME, track);
  },
  async delete(id: string): Promise<void> {
    await (await dbPromise).delete(STORE_NAME, id);
  },
};