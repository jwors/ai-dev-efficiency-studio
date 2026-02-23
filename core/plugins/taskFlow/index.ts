import 'server-only'
import { callLLM } from '@/core/llm'
import { clampMessagesToBudget } from '@/core/llm/estimateToken'
import type { SessionState } from '@/core/types/type'
import type { PluginResult } from '../types'
import { FlowchartSchema,type FlowchartGraph } from './schema'
import { flowchartPrompt } from '@/core/prompts/taskFlowPrompt' 

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

export async function runTaskFlowPlugin(
	input: string,
	state: SessionState
): Promise<PluginResult<FlowchartGraph>>{

	let context = flowchartPrompt(input, state)
	
	context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT)

	const rawText = await callLLM(context)

	let json: unknown;
	try {
		json = JSON.parse(rawText.content)
	} catch {
		return {
      name: 'TF',
      ok: false,
      error: 'TF plugin must return valid JSON',
    };
	}
	  // zod 验证
		const parsed = FlowchartSchema.safeParse(json);
		if (!parsed.success) {
			return {
				name: 'TF',
				ok: false,
				error: 'Invalid TF output (schema mismatch)',
			};
		}
	
		state.flowchart = parsed.data;
		return {
			name: 'tf',
			ok: true,
			data: parsed.data,
		};
}