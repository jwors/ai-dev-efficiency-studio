import { SessionState } from '@/core/types/type';

const memStore = new Map<string, SessionState>

export function getSession(sessionId: string): SessionState { 
	const s = memStore.get(sessionId)

	if (s) return s;

	const init: SessionState = {
		sessionId,
		summary: '',
		history: [],
		createdAt: Date.now(),
		updatedAt:Date.now()
	}
	memStore.set(sessionId, init)
	return init
}

// 存储会话信息
export function saveSession(state: SessionState) { 
	state.updatedAt = Date.now();
	memStore.set(state.sessionId,state)
}