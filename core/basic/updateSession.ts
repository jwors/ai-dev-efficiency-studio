import { callLLmSummary } from '../llm';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';
import { SessionState } from '../types/type';

export async function updateSession(input: string, state: SessionState) {
	state.history.push({
		role: 'user',
		content:input
	})
	await updateSummaryIfNeeded(state,callLLmSummary)
}