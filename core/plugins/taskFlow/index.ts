import 'server-only'
import { callLLM } from '@/core/llm'
import { clampMessagesToBudget } from '@/core/llm/estimateToken'
import type { SessionState } from '@/core/types';
import type { PluginResult } from '../types'
import { FlowchartSchema,type FlowchartGraph } from './schema'
import { flowchartPrompt } from '@/core/prompts/taskFlowPrompt' 

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

/**
 * 运行任务流程图插件。
 * 根据用户输入生成流程图结构，用于任务执行流程可视化。
 * @param input - 用户输入
 * @param state - 会话状态
 * @returns 插件执行结果，包含流程图数据
 */
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
      name: 'tf',
      ok: false,
      error: 'tf plugin must return valid JSON',
    };
	}
	  // zod 验证
		const parsed = FlowchartSchema.safeParse(json);
		if (!parsed.success) {
			return {
				name: 'tf',
				ok: false,
				error: 'Invalid tf output (schema mismatch)',
			};
		}
	
		state.flowchart = parsed.data;
		return {
			name: 'tf',
			ok: true,
			data: parsed.data,
		};
}