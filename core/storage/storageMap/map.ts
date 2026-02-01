import { SessionState } from '@/core/types/type';
import { loadSessionFromFile, saveSessiontoFile } from '@/core/storage/fileStorage/fileSave';
import { loadSessionFromKv, saveSessionToKv } from '@/core/storage/kvStorage/kvStore';

const memStore = new Map<string, SessionState>();

function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getSession(sessionId: string): Promise<SessionState> {
  const s = memStore.get(sessionId);
  if (s) return s;

  let loaded: SessionState | null = null;
  if (isKvConfigured()) {
    loaded = await loadSessionFromKv(sessionId);
  } else {
    loaded = loadSessionFromFile(sessionId);
  }
  if (loaded) {
    memStore.set(sessionId, loaded);
    return loaded;
  }

  const init: SessionState = {
    sessionId,
    summary: '',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  memStore.set(sessionId, init);
  return init;
}


export async function saveSession(state: SessionState) {
  state.updatedAt = Date.now();
  memStore.set(state.sessionId, state);
  if (isKvConfigured()) {
    await saveSessionToKv(state);
  } else {
    saveSessiontoFile(state);
  }
}
