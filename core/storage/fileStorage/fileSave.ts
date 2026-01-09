import fs from 'fs'
import { SessionState } from '@/core/types/type';

import path from 'path'

const DIR = path.join(process.cwd(), ".agent_sessions");

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

export function loadSessionFromFile(sessionId: string): SessionState | null { 
	ensureDir()
	const p = path.join(DIR, `${sessionId}.json`);
	if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function saveSessiontoFile(state: SessionState) { 
	ensureDir;
	const p = path.join(DIR, `${state.sessionId}.json`);
	fs.writeFileSync(p, JSON.stringify(state, null, 2), "utf-8");
}